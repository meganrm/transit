import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.resolve(__dirname, "..");
const TEMP_INPUT = path.join(ROOT, "temp-input-data");

interface CommutePair {
    id: number;
    originLat: number;
    originLng: number;
    destLat: number;
    destLng: number;
}

interface CommuteTravelTime {
    id: number;
    carMinutes: number;
    carMinutesPeak: number;
    transitMinutes: number;
    transitModes: string[];
}

interface DistanceMatrixElement {
    status: string;
    duration?: { value: number };
    duration_in_traffic?: { value: number };
}

interface DistanceMatrixRow {
    elements: DistanceMatrixElement[];
}

interface DistanceMatrixResponse {
    status: string;
    error_message?: string;
    rows: DistanceMatrixRow[];
}

interface OriginGroup {
    routes: Array<{ id: number; destStr: string }>;
    uniqueDests: string[];
}

function nextMondayEightAmPst(): number {
    const now = new Date();
    const dayOfWeek = now.getDay(); // 0 = Sun, 1 = Mon, ..., 6 = Sat
    const daysUntilMonday = dayOfWeek === 0 ? 1 : 8 - dayOfWeek;
    const monday = new Date(now);
    monday.setDate(now.getDate() + daysUntilMonday);
    // 08:00 PST = 16:00 UTC (UTC-8)
    monday.setUTCHours(16, 0, 0, 0);
    return Math.floor(monday.getTime() / 1000);
}

function chunkArray<T>(arr: T[], size: number): T[][] {
    const chunks: T[][] = [];
    for (let i = 0; i < arr.length; i += size) {
        chunks.push(arr.slice(i, i + size));
    }
    return chunks;
}

async function fetchDistanceMatrix(
    origins: string[],
    destinations: string[],
    extraParams: Record<string, string>,
    apiKey: string,
): Promise<DistanceMatrixResponse> {
    const params = new URLSearchParams({
        origins: origins.join("|"),
        destinations: destinations.join("|"),
        key: apiKey,
        ...extraParams,
    });

    const url = `https://maps.googleapis.com/maps/api/distancematrix/json?${params}`;
    const response = await fetch(url);

    if (!response.ok) {
        throw new Error(
            `Google Distance Matrix API error: HTTP ${response.status}`,
        );
    }

    const parsed = (await response.json()) as DistanceMatrixResponse;

    if (parsed.status !== "OK") {
        throw new Error(
            `Google Distance Matrix API returned status "${parsed.status}"` +
                (parsed.error_message ? `: ${parsed.error_message}` : ""),
        );
    }

    return parsed;
}

function extractSeconds(
    element: DistanceMatrixElement,
    useTraffic: boolean,
): number | null {
    if (element.status !== "OK") return null;

    const source =
        useTraffic && element.duration_in_traffic != null
            ? element.duration_in_traffic
            : element.duration;

    if (source == null || typeof source.value !== "number") return null;
    return source.value;
}

function buildOriginGroups(pairs: CommutePair[]): Map<string, OriginGroup> {
    const groups = new Map<string, OriginGroup>();

    for (const pair of pairs) {
        const originStr = `${pair.originLat},${pair.originLng}`;
        const destStr = `${pair.destLat},${pair.destLng}`;

        let group = groups.get(originStr);
        if (!group) {
            group = { routes: [], uniqueDests: [] };
            groups.set(originStr, group);
        }

        group.routes.push({ id: pair.id, destStr });
        if (!group.uniqueDests.includes(destStr)) {
            group.uniqueDests.push(destStr);
        }
    }

    return groups;
}

async function fetchForOriginGroup(
    originStr: string,
    group: OriginGroup,
    extraParams: Record<string, string>,
    apiKey: string,
): Promise<Map<number, number>> {
    const useTraffic = "departure_time" in extraParams;
    const results = new Map<number, number>();

    // Chunk destinations in groups of 25 (API limit per request)
    const destChunks = chunkArray(group.uniqueDests, 25);

    for (const destChunk of destChunks) {
        const matrix = await fetchDistanceMatrix(
            [originStr],
            destChunk,
            extraParams,
            apiKey,
        );

        for (let i = 0; i < destChunk.length; i += 1) {
            const destStr = destChunk[i];
            const secs = extractSeconds(matrix.rows[0].elements[i], useTraffic);

            for (const route of group.routes) {
                if (route.destStr === destStr) {
                    results.set(route.id, secs ?? Number.NaN);
                }
            }
        }
    }

    return results;
}

async function run(): Promise<void> {
    const apiKey = process.env.GOOGLE_MAPS_API_KEY ?? "";
    if (!apiKey) {
        throw new Error(
            "GOOGLE_MAPS_API_KEY is not set. Add it to .env (see .env.example).",
        );
    }

    const odPath = path.join(TEMP_INPUT, "commute-od-pairs.json");
    let pairs: CommutePair[];
    try {
        const raw = await readFile(odPath, "utf8");
        pairs = JSON.parse(raw) as CommutePair[];
    } catch (error) {
        if ((error as NodeJS.ErrnoException).code === "ENOENT") {
            throw new Error(
                "temp-input-data/commute-od-pairs.json not found.\n" +
                    "Run: npm run fetch:lodes",
            );
        }
        throw error;
    }

    const originGroups = buildOriginGroups(pairs);

    console.log(
        `Fetching travel times for ${pairs.length} commute pairs across ${originGroups.size} unique origins...`,
    );

    const peakDepartureTime = String(nextMondayEightAmPst());
    const peakParams: Record<string, string> = {
        departure_time: peakDepartureTime,
        traffic_model: "best_guess",
    };
    const transitParams: Record<string, string> = {
        departure_time: peakDepartureTime,
    };

    const carById = new Map<number, number>();
    const peakById = new Map<number, number>();
    const transitById = new Map<number, number>();

    let completed = 0;
    const total = originGroups.size;

    for (const [originStr, group] of originGroups) {
        const [car, peak, transit] = await Promise.all([
            fetchForOriginGroup(originStr, group, { mode: "driving" }, apiKey),
            fetchForOriginGroup(
                originStr,
                group,
                { mode: "driving", ...peakParams },
                apiKey,
            ),
            fetchForOriginGroup(
                originStr,
                group,
                { mode: "transit", ...transitParams },
                apiKey,
            ),
        ]);

        for (const [id, secs] of car) carById.set(id, secs);
        for (const [id, secs] of peak) peakById.set(id, secs);
        for (const [id, secs] of transit) transitById.set(id, secs);

        completed += 1;
        process.stdout.write(`\r  ${completed}/${total} origins done`);
    }

    process.stdout.write("\n");

    const travelTimes: CommuteTravelTime[] = [];

    for (const pair of pairs) {
        const carSecs = carById.get(pair.id) ?? Number.NaN;
        const peakSecs = peakById.get(pair.id) ?? Number.NaN;
        const transitSecs = transitById.get(pair.id) ?? Number.NaN;

        if (!Number.isFinite(carSecs)) {
            console.warn(`Pair ${pair.id}: driving API returned no result — skipping.`);
            continue;
        }
        if (!Number.isFinite(peakSecs)) {
            console.warn(`Pair ${pair.id}: peak driving API returned no result — skipping.`);
            continue;
        }
        if (!Number.isFinite(transitSecs)) {
            console.warn(`Pair ${pair.id}: transit API returned no result — skipping.`);
            continue;
        }

        const carMinutes = Math.max(1, Math.round(carSecs / 60));
        const carMinutesPeak = Math.max(1, Math.round(peakSecs / 60));
        const transitMinutes = Math.max(1, Math.round(transitSecs / 60));

        if (carMinutesPeak < carMinutes) {
            console.warn(
                `Pair ${pair.id}: peak (${carMinutesPeak} min) < baseline (${carMinutes} min).`,
            );
        }

        travelTimes.push({
            id: pair.id,
            carMinutes,
            carMinutesPeak,
            transitMinutes,
            transitModes: ["Transit"],
        });
    }

    const outPath = path.join(TEMP_INPUT, "commute-travel-times.json");
    await mkdir(TEMP_INPUT, { recursive: true });
    await writeFile(
        outPath,
        `${JSON.stringify(travelTimes, null, 2)}\n`,
        "utf8",
    );

    console.log(`Wrote ${travelTimes.length} commute travel times to ${outPath}`);
}

run().catch((error) => {
    console.error(
        error instanceof Error ? (error.stack ?? error.message) : String(error),
    );
    process.exitCode = 1;
});

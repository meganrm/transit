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
    peakPeriod: "AM" | "PM";
    transitMinutes: number;
    transitModes: string[];
    transitWalkMinutes: number;
    transitTransfers: number;
    transitMaxWaitMinutes: number;
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

interface DirectionsStep {
    travel_mode: string;
    duration: { value: number };
    transit_details?: {
        line: {
            short_name?: string;
            name?: string;
        };
        departure_time?: { value: number };
        arrival_time?: { value: number };
    };
}

interface DirectionsResponse {
    status: string;
    error_message?: string;
    routes: Array<{
        legs: Array<{
            duration: { value: number };
            steps: DirectionsStep[];
        }>;
    }>;
}

interface OriginGroup {
    routes: Array<{ id: number; destStr: string }>;
    uniqueDests: string[];
}

function seattleEpoch(weekday: number, hour: number): number {
    // Find the next occurrence of `weekday` (0=Sun, 1=Mon...) at `hour:00`
    // in America/Los_Angeles, handling DST correctly.
    const tz = "America/Los_Angeles";
    const DAYS: Record<string, number> = {
        Sun: 0,
        Mon: 1,
        Tue: 2,
        Wed: 3,
        Thu: 4,
        Fri: 5,
        Sat: 6,
    };
    const now = new Date();
    for (let offset = 1; offset <= 7; offset++) {
        const candidate = new Date(now.getTime() + offset * 86_400_000);
        const wdayStr = new Intl.DateTimeFormat("en-US", {
            timeZone: tz,
            weekday: "short",
        }).format(candidate);
        if (DAYS[wdayStr] !== weekday) continue;

        const dateStr = new Intl.DateTimeFormat("en-CA", {
            timeZone: tz,
        }).format(candidate);
        const h = String(hour).padStart(2, "0");

        for (const off of ["-07:00", "-08:00"]) {
            const t = new Date(`${dateStr}T${h}:00:00${off}`);
            const seattleHour = parseInt(
                new Intl.DateTimeFormat("en-US", {
                    timeZone: tz,
                    hour: "2-digit",
                    hour12: false,
                }).format(t),
            );
            if (seattleHour === hour) return Math.floor(t.getTime() / 1000);
        }
    }
    throw new Error("seattleEpoch: could not resolve target time");
}

function seattleEpochRecentWeekday(hour: number): number {
    // Use the most recent past weekday (Mon–Fri) at `hour:00` Seattle time.
    // Future departure times break the Google GTFS feed (returns garbage routes);
    // past weekday times use the current valid feed and reflect real peak-hour service.
    const tz = "America/Los_Angeles";
    for (let daysAgo = 0; daysAgo <= 7; daysAgo++) {
        const candidate = new Date(Date.now() - daysAgo * 86_400_000);
        const dayOfWeek = new Intl.DateTimeFormat("en-US", {
            timeZone: tz,
            weekday: "short",
        }).format(candidate);
        if (dayOfWeek === "Sat" || dayOfWeek === "Sun") continue;

        const dateStr = new Intl.DateTimeFormat("en-CA", {
            timeZone: tz,
        }).format(candidate);
        const h = String(hour).padStart(2, "0");

        for (const off of ["-07:00", "-08:00"]) {
            const t = new Date(`${dateStr}T${h}:00:00${off}`);
            const seattleHour = parseInt(
                new Intl.DateTimeFormat("en-US", {
                    timeZone: tz,
                    hour: "2-digit",
                    hour12: false,
                }).format(t),
            );
            // Must be in the past so GTFS data is valid
            if (seattleHour === hour && t.getTime() < Date.now()) {
                return Math.floor(t.getTime() / 1000);
            }
        }
    }
    throw new Error("seattleEpochRecentWeekday: could not resolve target time");
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

async function fetchTransitDirections(
    originStr: string,
    destStr: string,
    departureTime: string,
    apiKey: string,
): Promise<{
    seconds: number;
    lines: string[];
    walkMinutes: number;
    transfers: number;
    maxWaitMinutes: number;
} | null> {
    const params = new URLSearchParams({
        origin: originStr,
        destination: destStr,
        mode: "transit",
        departure_time: departureTime,
        key: apiKey,
    });

    const url = `https://maps.googleapis.com/maps/api/directions/json?${params}`;
    const response = await fetch(url);
    if (!response.ok) return null;

    const parsed = (await response.json()) as DirectionsResponse;
    if (parsed.status !== "OK" || parsed.routes.length === 0) return null;

    const leg = parsed.routes[0].legs[0];
    const seen = new Set<string>();
    const lines: string[] = [];
    let walkSeconds = 0;
    let transitCount = 0;
    let prevArrivalTime: number | null = null;
    let maxWaitSeconds = 0;

    for (const step of leg.steps) {
        if (step.travel_mode === "WALKING") {
            walkSeconds += step.duration.value;
        } else if (step.travel_mode === "TRANSIT" && step.transit_details) {
            transitCount++;
            const dep = step.transit_details.departure_time?.value;
            if (prevArrivalTime !== null && dep !== undefined) {
                const wait = dep - prevArrivalTime;
                if (wait > maxWaitSeconds) maxWaitSeconds = wait;
            }
            prevArrivalTime =
                step.transit_details.arrival_time?.value ?? null;

            const label =
                step.transit_details.line.short_name ??
                step.transit_details.line.name ??
                "Transit";
            if (!seen.has(label)) {
                seen.add(label);
                lines.push(label);
            }
        }
    }

    return {
        seconds: leg.duration.value,
        lines,
        walkMinutes: Math.round(walkSeconds / 60),
        transfers: Math.max(0, transitCount - 1),
        maxWaitMinutes: Math.round(maxWaitSeconds / 60),
    };
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

    // Off-peak baseline: Sunday 10am Seattle (light traffic)
    const offPeakDepartureTime = String(seattleEpoch(0, 10));
    // Peak AM: Wednesday 8am Seattle (driving only — specific day for consistent traffic model)
    const peakAmDepartureTime = String(seattleEpoch(3, 8));
    // Peak PM: Wednesday 5pm Seattle (driving only)
    const peakPmDepartureTime = String(seattleEpoch(3, 17));
    // Transit: most recent past weekday 8am — future dates break GTFS; past weekday gives valid peak-hour routing
    const transitDepartureTime = String(seattleEpochRecentWeekday(8));

    const carParams: Record<string, string> = {
        mode: "driving",
        departure_time: offPeakDepartureTime,
        traffic_model: "optimistic",
    };
    const peakAmParams: Record<string, string> = {
        mode: "driving",
        departure_time: peakAmDepartureTime,
        traffic_model: "best_guess",
    };
    const peakPmParams: Record<string, string> = {
        mode: "driving",
        departure_time: peakPmDepartureTime,
        traffic_model: "best_guess",
    };

    // Load existing cache so retries skip already-fetched pairs
    const outPath = path.join(TEMP_INPUT, "commute-travel-times.json");
    const existingCache = new Map<number, CommuteTravelTime>();
    try {
        const raw = await readFile(outPath, "utf8");
        const existing = JSON.parse(raw) as CommuteTravelTime[];
        for (const t of existing) existingCache.set(t.id, t);
        console.log(`  Loaded ${existingCache.size} cached travel times.`);
    } catch {
        // No cache yet — start fresh
    }

    const cachedIds = new Set(existingCache.keys());
    const filteredGroups = new Map<string, OriginGroup>();
    for (const [originStr, group] of originGroups) {
        const uncachedRoutes = group.routes.filter((r) => !cachedIds.has(r.id));
        if (uncachedRoutes.length === 0) continue;
        const uncachedDests = [
            ...new Set(uncachedRoutes.map((r) => r.destStr)),
        ];
        filteredGroups.set(originStr, {
            routes: uncachedRoutes,
            uniqueDests: uncachedDests,
        });
    }

    if (filteredGroups.size === 0) {
        console.log("All travel times already cached — nothing to fetch.");
    }

    let completed = 0;
    const total = filteredGroups.size;

    for (const [originStr, group] of filteredGroups) {
        const [car, peakAm, peakPm] = await Promise.all([
            fetchForOriginGroup(originStr, group, carParams, apiKey),
            fetchForOriginGroup(originStr, group, peakAmParams, apiKey),
            fetchForOriginGroup(originStr, group, peakPmParams, apiKey),
        ]);

        for (const { id: pairId, destStr } of group.routes) {
            const carSecs = car.get(pairId) ?? Number.NaN;
            const peakAmSecs = peakAm.get(pairId) ?? Number.NaN;
            const peakPmSecs = peakPm.get(pairId) ?? Number.NaN;

            if (!Number.isFinite(carSecs)) {
                console.warn(`Pair ${pairId}: driving API returned no result — skipping.`);
                continue;
            }
            if (!Number.isFinite(peakAmSecs)) {
                console.warn(`Pair ${pairId}: peak AM driving API returned no result — skipping.`);
                continue;
            }
            if (!Number.isFinite(peakPmSecs)) {
                console.warn(`Pair ${pairId}: peak PM driving API returned no result — skipping.`);
                continue;
            }

            const transitResult = await fetchTransitDirections(
                originStr,
                destStr,
                transitDepartureTime,
                apiKey,
            );
            if (transitResult === null) {
                console.warn(`Pair ${pairId}: transit directions returned no result — skipping.`);
                continue;
            }

            const carMinutes = Math.max(1, Math.round(carSecs / 60));
            const peakPeriod: "AM" | "PM" = peakPmSecs >= peakAmSecs ? "PM" : "AM";
            const carMinutesPeak = Math.max(1, Math.round(Math.max(peakAmSecs, peakPmSecs) / 60));
            const transitMinutes = Math.max(1, Math.round(transitResult.seconds / 60));

            if (carMinutesPeak < carMinutes) {
                console.warn(`Pair ${pairId}: peak (${carMinutesPeak} min) < baseline (${carMinutes} min).`);
            }

            existingCache.set(pairId, {
                id: pairId,
                carMinutes,
                carMinutesPeak,
                peakPeriod,
                transitMinutes,
                transitModes: transitResult.lines.length > 0 ? transitResult.lines : ["Transit"],
                transitWalkMinutes: transitResult.walkMinutes,
                transitTransfers: transitResult.transfers,
                transitMaxWaitMinutes: transitResult.maxWaitMinutes,
            });
        }

        // Save after each origin so progress survives a quota failure
        await mkdir(TEMP_INPUT, { recursive: true });
        await writeFile(outPath, `${JSON.stringify([...existingCache.values()], null, 2)}\n`, "utf8");

        completed += 1;
        process.stdout.write(`\r  ${completed}/${total} origins done`);
    }

    if (total > 0) process.stdout.write("\n");

    const travelTimes = [...existingCache.values()];

    await mkdir(TEMP_INPUT, { recursive: true });
    await writeFile(
        outPath,
        `${JSON.stringify(travelTimes, null, 2)}\n`,
        "utf8",
    );

    console.log(
        `Wrote ${travelTimes.length} commute travel times to ${outPath}`,
    );
}

run().catch((error) => {
    console.error(
        error instanceof Error ? (error.stack ?? error.message) : String(error),
    );
    process.exitCode = 1;
});

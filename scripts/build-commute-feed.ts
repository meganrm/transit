import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import type { Route } from "../src/types";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.resolve(__dirname, "..");
const FETCH_CONFIG = path.join(ROOT, "fetch-config");
const TEMP_INPUT = path.join(ROOT, "temp-input-data");

interface CommutePair {
    id: number;
    originTractId: string;
    originName: string;
    originLat: number;
    originLng: number;
    destTractId: string;
    destName: string;
    destLat: number;
    destLng: number;
    commuters: number;
}

interface CommuteTravelTime {
    id: number;
    carMinutes: number;
    carMinutesPeak: number;
    peakPeriod: "AM" | "PM";
    transitMinutes: number;
    transitModes: string[];
}

interface LodesConfig {
    peakHours?: string;
    primaryN?: number;
}

interface RouteFeed {
    sourceLabel: string;
    generatedAt: string;
    routes: Route[];
}

async function maybeReadJson<T>(filePath: string): Promise<T | null> {
    try {
        const raw = await readFile(filePath, "utf8");
        return JSON.parse(raw) as T;
    } catch (error) {
        if ((error as NodeJS.ErrnoException).code === "ENOENT") {
            return null;
        }
        throw error;
    }
}

async function loadRequired<T>(
    filePath: string,
    runCommand: string,
): Promise<T> {
    const result = await maybeReadJson<T>(filePath);
    if (result === null) {
        throw new Error(
            `${path.relative(ROOT, filePath)} not found.\nRun: ${runCommand}`,
        );
    }
    return result;
}

function validateRoutes(routes: Route[]): void {
    const ids = new Set<number>();
    for (const route of routes) {
        if (ids.has(route.id)) {
            throw new Error(`Duplicate route id: ${route.id}`);
        }
        ids.add(route.id);
        if (route.coordinates.length < 2) {
            throw new Error(
                `Route ${route.id} must have at least 2 coordinates`,
            );
        }
        if (
            route.carMinutes <= 0 ||
            route.carMinutesPeak <= 0 ||
            route.transitMinutes <= 0
        ) {
            throw new Error(`Route ${route.id} has non-positive travel times`);
        }
        if (route.dailyCommuters <= 0) {
            throw new Error(
                `Route ${route.id} has non-positive dailyCommuters`,
            );
        }
    }
}

async function run(): Promise<void> {
    const [pairs, travelTimes, lodesConfig, tractNamesRaw] = await Promise.all([
        loadRequired<CommutePair[]>(
            path.join(TEMP_INPUT, "commute-od-pairs.json"),
            "npm run fetch:lodes",
        ),
        loadRequired<CommuteTravelTime[]>(
            path.join(TEMP_INPUT, "commute-travel-times.json"),
            "npm run fetch:commute-times",
        ),
        maybeReadJson<LodesConfig>(
            path.join(FETCH_CONFIG, "lodes-config.json"),
        ),
        maybeReadJson<Record<string, string>>(
            path.join(FETCH_CONFIG, "tract-names.json"),
        ),
    ]);

    const tractNames = new Map<string, string>(
        Object.entries(tractNamesRaw ?? {}).filter(([, v]) => v !== ""),
    );

    const timesById = new Map<number, CommuteTravelTime>();
    for (const t of travelTimes) {
        timesById.set(t.id, t);
    }

    const routes: Route[] = [];

    for (const pair of pairs) {
        const times = timesById.get(pair.id);
        if (!times) {
            console.warn(
                `Pair ${pair.id}: no travel times found (${pair.originName} → ${pair.destName}) — skipping.`,
            );
            continue;
        }

        const originName =
            tractNames.get(pair.originTractId) ?? pair.originName;
        const destName = tractNames.get(pair.destTractId) ?? pair.destName;

        routes.push({
            id: pair.id,
            name: `${originName} → ${destName}`,
            description: `${pair.commuters.toLocaleString()} daily commuters`,
            coordinates: [
                [pair.originLat, pair.originLng],
                [pair.destLat, pair.destLng],
            ],
            carMinutes: times.carMinutes,
            carMinutesPeak: times.carMinutesPeak,
            transitMinutes: times.transitMinutes,
            transitModes: times.transitModes,
            dailyCommuters: pair.commuters,
            peakHours: times.peakPeriod === "AM" ? "AM" : "PM",
            supplemental: routes.length >= (lodesConfig?.primaryN ?? 60),
        });
    }

    validateRoutes(routes);

    const outPath = path.join(ROOT, "public", "data", "routes.feed.json");
    const payload: RouteFeed = {
        sourceLabel: "LODES commute data (2021) + Google Maps",
        generatedAt: new Date().toISOString(),
        routes,
    };

    await mkdir(path.dirname(outPath), { recursive: true });
    await writeFile(outPath, `${JSON.stringify(payload, null, 2)}\n`, "utf8");

    console.log(`Wrote ${routes.length} commute routes to ${outPath}`);
}

run().catch((error) => {
    console.error(
        error instanceof Error ? (error.stack ?? error.message) : String(error),
    );
    process.exitCode = 1;
});

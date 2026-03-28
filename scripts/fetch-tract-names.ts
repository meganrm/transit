import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.resolve(__dirname, "..");
const FETCH_CONFIG = path.join(ROOT, "fetch-config");
const TEMP_INPUT = path.join(ROOT, "temp-input-data");

interface CommutePair {
    originTractId: string;
    originLat: number;
    originLng: number;
    destTractId: string;
    destLat: number;
    destLng: number;
}

interface GeocodeAddressComponent {
    long_name: string;
    short_name: string;
    types: string[];
}

interface GeocodeResult {
    address_components: GeocodeAddressComponent[];
    status?: string;
}

interface GeocodeResponse {
    status: string;
    results: GeocodeResult[];
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

function extractNeighborhoodName(results: GeocodeResult[]): string {
    const preference = [
        "neighborhood",
        "sublocality_level_1",
        "sublocality",
        "locality",
    ];
    for (const type of preference) {
        for (const result of results) {
            for (const component of result.address_components) {
                if (component.types.includes(type)) {
                    return component.long_name;
                }
            }
        }
    }
    return "";
}

async function geocodeTract(
    tractId: string,
    lat: number,
    lng: number,
    apiKey: string,
): Promise<string> {
    const url =
        `https://maps.googleapis.com/maps/api/geocode/json` +
        `?latlng=${lat},${lng}` +
        `&result_type=neighborhood%7Csublocality%7Cpolitical` +
        `&key=${apiKey}`;

    const response = await fetch(url);
    if (!response.ok) {
        console.warn(`  Tract ${tractId}: HTTP ${response.status} — skipping.`);
        return "";
    }

    const data = (await response.json()) as GeocodeResponse;
    if (data.status !== "OK" && data.status !== "ZERO_RESULTS") {
        console.warn(`  Tract ${tractId}: API status ${data.status} — skipping.`);
        return "";
    }

    return extractNeighborhoodName(data.results);
}

async function run(): Promise<void> {
    const apiKey = process.env.GOOGLE_MAPS_API_KEY ?? "";
    if (!apiKey) {
        throw new Error(
            "GOOGLE_MAPS_API_KEY is not set.\nAdd it to your .env file.",
        );
    }

    const pairs = await maybeReadJson<CommutePair[]>(
        path.join(TEMP_INPUT, "commute-od-pairs.json"),
    );
    if (!pairs) {
        throw new Error(
            "temp-input-data/commute-od-pairs.json not found.\nRun: npm run fetch:lodes",
        );
    }

    // Collect unique tracts with their coords
    const tracts = new Map<string, { lat: number; lng: number }>();
    for (const pair of pairs) {
        tracts.set(pair.originTractId, { lat: pair.originLat, lng: pair.originLng });
        tracts.set(pair.destTractId, { lat: pair.destLat, lng: pair.destLng });
    }

    // Load existing names; preserve manual edits and skip already-resolved tracts
    const existing =
        (await maybeReadJson<Record<string, string>>(
            path.join(FETCH_CONFIG, "tract-names.json"),
        )) ?? {};

    const toGeocode = [...tracts.entries()].filter(
        ([id]) => !existing[id],
    );

    console.log(
        `${tracts.size} unique tracts; ${toGeocode.length} need geocoding.`,
    );

    const resolved: Record<string, string> = { ...existing };

    for (const [tractId, { lat, lng }] of toGeocode) {
        const name = await geocodeTract(tractId, lat, lng, apiKey);
        resolved[tractId] = name;
        console.log(`  ${tractId} → "${name || "(no match)"}"`);
    }

    await mkdir(FETCH_CONFIG, { recursive: true });
    const outPath = path.join(FETCH_CONFIG, "tract-names.json");
    await writeFile(outPath, `${JSON.stringify(resolved, null, 2)}\n`, "utf8");
    console.log(`Wrote ${Object.keys(resolved).length} tract names to ${outPath}`);
}

run().catch((error) => {
    console.error(
        error instanceof Error ? (error.stack ?? error.message) : String(error),
    );
    process.exitCode = 1;
});

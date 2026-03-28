import { createGunzip } from "node:zlib";
import { createInterface } from "node:readline";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { Readable } from "node:stream";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.resolve(__dirname, "..");
const FETCH_CONFIG = path.join(ROOT, "fetch-config");
const TEMP_INPUT = path.join(ROOT, "temp-input-data");

interface BoundsConfig {
    minLat: number;
    maxLat: number;
    minLng: number;
    maxLng: number;
}

interface LodesConfig {
    countyFips: string;
    lodesYear: number;
    topN: number;
    minCommuters: number;
    excludeSelfTracts: boolean;
    peakHours: string;
    bounds?: BoundsConfig;
    maxPairsPerDest?: number;
}

interface TractCentroid {
    lat: number;
    lng: number;
}

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

async function loadConfig(): Promise<LodesConfig> {
    const configPath = path.join(FETCH_CONFIG, "lodes-config.json");
    try {
        const raw = await readFile(configPath, "utf8");
        return JSON.parse(raw) as LodesConfig;
    } catch (error) {
        if ((error as NodeJS.ErrnoException).code === "ENOENT") {
            throw new Error(
                "fetch-config/lodes-config.json not found.\n" +
                    "Copy fetch-config/lodes-config.example.json → fetch-config/lodes-config.json and adjust as needed.",
            );
        }
        throw error;
    }
}

async function loadTractNames(): Promise<Map<string, string>> {
    const namesPath = path.join(FETCH_CONFIG, "tract-names.json");
    try {
        const raw = await readFile(namesPath, "utf8");
        const obj = JSON.parse(raw) as Record<string, string>;
        return new Map(Object.entries(obj));
    } catch (error) {
        if ((error as NodeJS.ErrnoException).code === "ENOENT") {
            return new Map();
        }
        throw error;
    }
}

function lodesUrl(year: number): string {
    return `https://lehd.ces.census.gov/data/lodes/LODES8/wa/od/wa_od_main_JT00_${year}.csv.gz`;
}

const CENTROIDS_URL =
    "https://www2.census.gov/geo/docs/reference/cenpop2020/tract/CenPop2020_Mean_TR53.txt";

async function streamLodesOd(
    url: string,
    countyFips: string,
    excludeSelfTracts: boolean,
): Promise<Map<string, number>> {
    console.log(`Downloading LODES OD file: ${url}`);
    const response = await fetch(url);
    if (!response.ok) {
        throw new Error(`Failed to download LODES file: HTTP ${response.status} from ${url}`);
    }
    if (!response.body) {
        throw new Error("Response body is null");
    }

    const nodeStream = Readable.fromWeb(
        response.body as import("stream/web").ReadableStream<Uint8Array>,
    );
    const gunzip = createGunzip();
    nodeStream.pipe(gunzip);

    const rl = createInterface({ input: gunzip, crlfDelay: Infinity });

    const pairCounts = new Map<string, number>();
    let lineNum = 0;
    let headerIndices: Record<string, number> = {};

    for await (const line of rl) {
        lineNum += 1;

        if (lineNum === 1) {
            // Parse header
            const cols = line.split(",");
            for (let i = 0; i < cols.length; i++) {
                headerIndices[cols[i].trim()] = i;
            }
            const required = ["w_geocode", "h_geocode", "S000"];
            for (const col of required) {
                if (!(col in headerIndices)) {
                    throw new Error(`LODES CSV missing required column: ${col}`);
                }
            }
            continue;
        }

        const cols = line.split(",");
        const wGeocode = cols[headerIndices["w_geocode"]]?.trim() ?? "";
        const hGeocode = cols[headerIndices["h_geocode"]]?.trim() ?? "";
        const s000Raw = cols[headerIndices["S000"]]?.trim() ?? "0";

        if (wGeocode.length < 11 || hGeocode.length < 11) continue;

        const originTract = hGeocode.slice(0, 11);
        const destTract = wGeocode.slice(0, 11);

        // Both tracts must be in the target county
        if (!originTract.startsWith(countyFips) || !destTract.startsWith(countyFips)) continue;

        if (excludeSelfTracts && originTract === destTract) continue;

        const count = parseInt(s000Raw, 10);
        if (!Number.isFinite(count) || count <= 0) continue;

        const key = `${originTract}|${destTract}`;
        pairCounts.set(key, (pairCounts.get(key) ?? 0) + count);
    }

    console.log(`Parsed ${lineNum - 1} data rows from LODES file.`);
    return pairCounts;
}

async function fetchCentroids(): Promise<Map<string, TractCentroid>> {
    console.log(`Downloading Census tract centroids: ${CENTROIDS_URL}`);
    const response = await fetch(CENTROIDS_URL);
    if (!response.ok) {
        throw new Error(
            `Failed to download Census centroids: HTTP ${response.status}`,
        );
    }

    const text = await response.text();
    const lines = text.split("\n");
    const centroids = new Map<string, TractCentroid>();

    // Header: STATEFP,COUNTYFP,TRACTCE,POPULATION,LATITUDE,LONGITUDE
    let headerIndices: Record<string, number> = {};
    for (let i = 0; i < lines.length; i++) {
        const line = lines[i].trim();
        if (!line) continue;

        const cols = line.split(",").map((c) => c.trim());

        if (i === 0) {
            for (let j = 0; j < cols.length; j++) {
                headerIndices[cols[j]] = j;
            }
            continue;
        }

        const statefp = cols[headerIndices["STATEFP"]] ?? "";
        const countyfp = cols[headerIndices["COUNTYFP"]] ?? "";
        const tractce = cols[headerIndices["TRACTCE"]] ?? "";
        const latRaw = cols[headerIndices["LATITUDE"]] ?? "";
        const lngRaw = cols[headerIndices["LONGITUDE"]] ?? "";

        const lat = parseFloat(latRaw);
        const lng = parseFloat(lngRaw);
        if (!Number.isFinite(lat) || !Number.isFinite(lng)) continue;

        // Tract ID = STATEFP + COUNTYFP + TRACTCE (11 digits total)
        const tractId = `${statefp}${countyfp}${tractce}`;
        centroids.set(tractId, { lat, lng });
    }

    console.log(`Loaded ${centroids.size} tract centroids.`);
    return centroids;
}

function tractShortName(tractId: string): string {
    // Last 6 chars are TRACTCE, e.g. "009300" → "9300" (drop leading zeros but keep structure)
    const tractce = tractId.slice(5); // STATEFP(2) + COUNTYFP(3) = 5 chars, rest is TRACTCE
    const numeric = parseInt(tractce, 10);
    return `Tract ${Number.isFinite(numeric) ? numeric : tractce}`;
}

function inBounds(centroid: TractCentroid, bounds: BoundsConfig): boolean {
    return (
        centroid.lat >= bounds.minLat &&
        centroid.lat <= bounds.maxLat &&
        centroid.lng >= bounds.minLng &&
        centroid.lng <= bounds.maxLng
    );
}

async function run(): Promise<void> {
    const config = await loadConfig();
    const tractNames = await loadTractNames();

    const pairCounts = await streamLodesOd(
        lodesUrl(config.lodesYear),
        config.countyFips,
        config.excludeSelfTracts,
    );

    // Sort pairs by commuter count descending, filter by minCommuters — do NOT slice yet
    const candidates = [...pairCounts.entries()]
        .filter(([, count]) => count >= config.minCommuters)
        .sort(([, a], [, b]) => b - a);

    console.log(
        `Found ${pairCounts.size} unique pairs; ${candidates.length} with ≥ ${config.minCommuters} commuters.`,
    );

    const centroids = await fetchCentroids();

    // Apply bounds + maxPairsPerDest filtering, then take topN
    const destCounts = new Map<string, number>();
    const accepted: Array<[string, number]> = [];

    for (const [key, commuters] of candidates) {
        if (accepted.length >= config.topN) break;

        const [originTractId, destTractId] = key.split("|");

        const originCentroid = centroids.get(originTractId);
        const destCentroid = centroids.get(destTractId);

        if (!originCentroid) {
            console.warn(`No centroid for origin tract ${originTractId} — skipping pair.`);
            continue;
        }
        if (!destCentroid) {
            console.warn(`No centroid for dest tract ${destTractId} — skipping pair.`);
            continue;
        }

        if (config.bounds) {
            if (!inBounds(originCentroid, config.bounds) || !inBounds(destCentroid, config.bounds)) {
                continue;
            }
        }

        if (config.maxPairsPerDest !== undefined) {
            const count = destCounts.get(destTractId) ?? 0;
            if (count >= config.maxPairsPerDest) continue;
            destCounts.set(destTractId, count + 1);
        }

        accepted.push([key, commuters]);
    }

    console.log(`Keeping ${accepted.length} pairs after filtering.`);

    // Collect all unique tract IDs for the template file
    const allTractIds = new Set<string>();
    for (const [key] of accepted) {
        const [origin, dest] = key.split("|");
        allTractIds.add(origin);
        allTractIds.add(dest);
    }

    const pairs: CommutePair[] = [];
    let idCounter = 1;

    for (const [key, commuters] of accepted) {
        const [originTractId, destTractId] = key.split("|");
        const originCentroid = centroids.get(originTractId)!;
        const destCentroid = centroids.get(destTractId)!;

        const originName =
            tractNames.get(originTractId) ?? tractShortName(originTractId);
        const destName =
            tractNames.get(destTractId) ?? tractShortName(destTractId);

        pairs.push({
            id: idCounter++,
            originTractId,
            originName,
            originLat: originCentroid.lat,
            originLng: originCentroid.lng,
            destTractId,
            destName,
            destLat: destCentroid.lat,
            destLng: destCentroid.lng,
            commuters,
        });
    }

    // Write commute-od-pairs.json
    const odPath = path.join(TEMP_INPUT, "commute-od-pairs.json");
    await mkdir(TEMP_INPUT, { recursive: true });
    await writeFile(odPath, `${JSON.stringify(pairs, null, 2)}\n`, "utf8");
    console.log(`Wrote ${pairs.length} commute OD pairs to ${odPath}`);

    // Write tract-names-template.json for optional human-readable names
    const templatePath = path.join(TEMP_INPUT, "tract-names-template.json");
    const template: Record<string, string> = {};
    for (const tractId of [...allTractIds].sort()) {
        template[tractId] = tractNames.get(tractId) ?? "";
    }
    await writeFile(
        templatePath,
        `${JSON.stringify(template, null, 2)}\n`,
        "utf8",
    );
    console.log(
        `Wrote tract name template to ${templatePath} — copy to tract-names.json and fill in neighborhood names.`,
    );
}

run().catch((error) => {
    console.error(
        error instanceof Error ? (error.stack ?? error.message) : String(error),
    );
    process.exitCode = 1;
});

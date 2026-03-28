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

interface Neighborhood {
    lat: number;
    lng: number;
}

interface LodesConfig {
    countyFips: string;
    lodesYear: number;
    topN: number;
    minCommuters: number;
    excludeSelfTracts: boolean;
    peakHours: string;
    maxAssignDistKm: number;
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

async function loadNeighborhoods(): Promise<Map<string, Neighborhood>> {
    const nbPath = path.join(FETCH_CONFIG, "neighborhoods.json");
    const raw = await readFile(nbPath, "utf8");
    const obj = JSON.parse(raw) as Record<string, Neighborhood>;
    return new Map(Object.entries(obj));
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

        const tractId = `${statefp}${countyfp}${tractce}`;
        centroids.set(tractId, { lat, lng });
    }

    console.log(`Loaded ${centroids.size} tract centroids.`);
    return centroids;
}

function distKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
    const R = 6371;
    const dLat = ((lat2 - lat1) * Math.PI) / 180;
    const dLng = ((lng2 - lng1) * Math.PI) / 180;
    const a =
        Math.sin(dLat / 2) ** 2 +
        Math.cos((lat1 * Math.PI) / 180) *
            Math.cos((lat2 * Math.PI) / 180) *
            Math.sin(dLng / 2) ** 2;
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function assignNeighborhood(
    centroid: TractCentroid,
    neighborhoods: Map<string, Neighborhood>,
    maxDistKm: number,
): string | null {
    let bestName: string | null = null;
    let bestDist = Infinity;
    for (const [name, nb] of neighborhoods) {
        const d = distKm(centroid.lat, centroid.lng, nb.lat, nb.lng);
        if (d < bestDist) {
            bestDist = d;
            bestName = name;
        }
    }
    return bestDist <= maxDistKm ? bestName : null;
}

async function run(): Promise<void> {
    const config = await loadConfig();
    const neighborhoods = await loadNeighborhoods();

    const pairCounts = await streamLodesOd(
        lodesUrl(config.lodesYear),
        config.countyFips,
        config.excludeSelfTracts,
    );

    const centroids = await fetchCentroids();

    // Assign each tract to its nearest neighborhood (cached)
    const tractToNeighborhood = new Map<string, string | null>();
    const getNeighborhood = (tractId: string): string | null => {
        if (!tractToNeighborhood.has(tractId)) {
            const centroid = centroids.get(tractId);
            tractToNeighborhood.set(
                tractId,
                centroid
                    ? assignNeighborhood(centroid, neighborhoods, config.maxAssignDistKm)
                    : null,
            );
        }
        return tractToNeighborhood.get(tractId) ?? null;
    };

    // Aggregate tract-pair counts into neighborhood-pair counts
    const neighborhoodPairs = new Map<string, number>();
    for (const [key, commuters] of pairCounts) {
        const [originTractId, destTractId] = key.split("|");
        const originNb = getNeighborhood(originTractId);
        const destNb = getNeighborhood(destTractId);
        if (!originNb || !destNb || originNb === destNb) continue;
        const nbKey = `${originNb}|${destNb}`;
        neighborhoodPairs.set(nbKey, (neighborhoodPairs.get(nbKey) ?? 0) + commuters);
    }

    const candidates = [...neighborhoodPairs.entries()]
        .filter(([, count]) => count >= config.minCommuters)
        .sort(([, a], [, b]) => b - a)
        .slice(0, config.topN);

    console.log(
        `Aggregated ${neighborhoodPairs.size} neighborhood pairs; keeping top ${candidates.length}.`,
    );

    const pairs: CommutePair[] = [];
    let idCounter = 1;

    for (const [key, commuters] of candidates) {
        const [originName, destName] = key.split("|");
        const originNb = neighborhoods.get(originName)!;
        const destNb = neighborhoods.get(destName)!;

        pairs.push({
            id: idCounter++,
            originTractId: originName,
            originName,
            originLat: originNb.lat,
            originLng: originNb.lng,
            destTractId: destName,
            destName,
            destLat: destNb.lat,
            destLng: destNb.lng,
            commuters,
        });
    }

    const odPath = path.join(TEMP_INPUT, "commute-od-pairs.json");
    await mkdir(TEMP_INPUT, { recursive: true });
    await writeFile(odPath, `${JSON.stringify(pairs, null, 2)}\n`, "utf8");
    console.log(`Wrote ${pairs.length} commute OD pairs to ${odPath}`);
}

run().catch((error) => {
    console.error(
        error instanceof Error ? (error.stack ?? error.message) : String(error),
    );
    process.exitCode = 1;
});

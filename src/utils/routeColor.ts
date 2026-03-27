import type { ColorMode } from "../types";
import { routes } from "../data/routes";

// --- Palette shape (ratio-based modes) ---
// Interior stops define the PiYG diverging curve; endpoints are data-anchored.
const RATIO_INNER_STOPS: [number, number, number, number][] = [
    [0.85, 161, 215, 106], // medium green
    [1.0, 230, 245, 208], // pale green — equal
    [1.1, 253, 224, 239], // pale pink
    [1.8, 233, 163, 201], // medium pink
];

// --- Data ranges computed at module load ---
function computeRatioRange(noTraffic: boolean): { min: number; max: number } {
    let min = Infinity,
        max = -Infinity;
    for (const r of routes) {
        const ratio = r.transitMinutes / (noTraffic ? r.carMinutes : r.carMinutesPeak);
        if (ratio < min) min = ratio;
        if (ratio > max) max = ratio;
    }
    return { min, max };
}

function computePMRange(): { min: number; max: number } {
    let min = Infinity,
        max = -Infinity;
    for (const r of routes) {
        const pm = (r.transitMinutes - r.carMinutesPeak) * r.dailyCommuters;
        if (pm < min) min = pm;
        if (pm > max) max = pm;
    }
    return { min, max };
}

const RANGE_NO_TRAFFIC = computeRatioRange(true);
const RANGE_PEAK_TRAFFIC = computeRatioRange(false);
const RANGE_PM = computePMRange();

export const DATA_PERSON_MINUTES_MAX = RANGE_PM.max;
export const DATA_PERSON_MINUTES_MIN = RANGE_PM.min;

// --- Color stop builders ---
function buildRatioStops(
    min: number,
    max: number,
): [number, number, number, number][] {
    const innerInRange = RATIO_INNER_STOPS.filter(
        ([ratio]) => ratio > min && ratio < max,
    );
    return [
        [min, 77, 146, 33],
        ...innerInRange,
        [max, 197, 27, 125],
    ];
}

function buildPMStops(
    min: number,
    max: number,
): [number, number, number, number][] {
    if (min < 0) {
        // Full diverging: min (green) → 0 (neutral) → max (magenta)
        return [
            [min, 77, 146, 33],
            [0, 230, 245, 208],
            [max, 197, 27, 125],
        ];
    }
    // Sequential (all routes lose time): neutral → magenta
    return [
        [min, 230, 245, 208],
        [max, 197, 27, 125],
    ];
}

// Cached per-mode stop arrays
const STOPS: Record<ColorMode, [number, number, number, number][]> = {
    "no-traffic": buildRatioStops(RANGE_NO_TRAFFIC.min, RANGE_NO_TRAFFIC.max),
    "peak-traffic": buildRatioStops(RANGE_PEAK_TRAFFIC.min, RANGE_PEAK_TRAFFIC.max),
    "person-minutes": buildPMStops(RANGE_PM.min, RANGE_PM.max),
};

// Legacy export for consumers that pass a synthetic peak-traffic ratio
export const COLOR_STOPS = STOPS["peak-traffic"];

// --- Interpolation ---
function interpolateStops(
    value: number,
    stops: [number, number, number, number][],
): [number, number, number] {
    if (value <= stops[0][0]) return [stops[0][1], stops[0][2], stops[0][3]];
    for (let i = 0; i < stops.length - 1; i++) {
        const [v0, r0, g0, b0] = stops[i];
        const [v1, r1, g1, b1] = stops[i + 1];
        if (value <= v1) {
            const t = (value - v0) / (v1 - v0);
            return [
                Math.round(r0 + t * (r1 - r0)),
                Math.round(g0 + t * (g1 - g0)),
                Math.round(b0 + t * (b1 - b0)),
            ];
        }
    }
    const last = stops[stops.length - 1];
    return [last[1], last[2], last[3]];
}

// --- Public API ---
export function getRouteRgb(
    route: {
        transitMinutes: number;
        carMinutesPeak: number;
        carMinutes?: number;
        dailyCommuters?: number;
    },
    colorMode: ColorMode = "peak-traffic",
): [number, number, number] {
    let value: number;
    if (colorMode === "no-traffic") {
        value = route.transitMinutes / (route.carMinutes ?? route.carMinutesPeak);
    } else if (colorMode === "peak-traffic") {
        value = route.transitMinutes / route.carMinutesPeak;
    } else {
        value =
            (route.transitMinutes - route.carMinutesPeak) *
            (route.dailyCommuters ?? 0);
    }
    return interpolateStops(value, STOPS[colorMode]);
}

export function getRouteColor(
    route: {
        transitMinutes: number;
        carMinutesPeak: number;
        carMinutes?: number;
        dailyCommuters?: number;
    },
    colorMode: ColorMode = "peak-traffic",
): string {
    const [r, g, b] = getRouteRgb(route, colorMode);
    return `rgb(${r},${g},${b})`;
}

export function buildLegendGradient(colorMode: ColorMode = "peak-traffic"): string {
    const stops = STOPS[colorMode];
    const min = stops[0][0];
    const max = stops[stops.length - 1][0];
    const range = max - min;
    const pct = (v: number) => `${(((v - min) / range) * 100).toFixed(1)}%`;
    return `linear-gradient(to right, ${stops
        .map(([v, r, g, b]) => `rgb(${r},${g},${b}) ${pct(v)}`)
        .join(", ")})`;
}

/** Position of the ratio=1.0 tick for modes 1 & 2. Returns null if out of range. */
export function getLegendEqualPct(
    colorMode: ColorMode = "peak-traffic",
): string | null {
    if (colorMode === "person-minutes") return null;
    const stops = STOPS[colorMode];
    const min = stops[0][0];
    const max = stops[stops.length - 1][0];
    if (1.0 <= min || 1.0 >= max) return null;
    return `${(((1.0 - min) / (max - min)) * 100).toFixed(1)}%`;
}

/** Position of the 0 (breakeven) tick for person-minutes mode. Returns null if all routes lose time. */
export function getLegendBreakevenPct(): string | null {
    const stops = STOPS["person-minutes"];
    const min = stops[0][0];
    const max = stops[stops.length - 1][0];
    if (0 <= min) return null;
    return `${(((0 - min) / (max - min)) * 100).toFixed(1)}%`;
}

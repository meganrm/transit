import type { MetricMode, TrafficMode } from "../types";
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
function computeRatioRange(trafficMode: TrafficMode): {
    min: number;
    max: number;
} {
    let min = Infinity,
        max = -Infinity;
    for (const r of routes) {
        const baselineCarMinutes =
            trafficMode === "peak-traffic" ? r.carMinutesPeak : r.carMinutes;
        const ratio = r.transitMinutes / baselineCarMinutes;
        if (ratio < min) min = ratio;
        if (ratio > max) max = ratio;
    }
    return { min, max };
}

function computePMRange(trafficMode: TrafficMode): {
    min: number;
    max: number;
} {
    let min = Infinity,
        max = -Infinity;
    for (const r of routes) {
        const baselineCarMinutes =
            trafficMode === "peak-traffic" ? r.carMinutesPeak : r.carMinutes;
        const pm = (r.transitMinutes - baselineCarMinutes) * r.dailyCommuters;
        if (pm < min) min = pm;
        if (pm > max) max = pm;
    }
    return { min, max };
}

const RATIO_RANGES: Record<TrafficMode, { min: number; max: number }> = {
    "no-traffic": computeRatioRange("no-traffic"),
    "peak-traffic": computeRatioRange("peak-traffic"),
};

const PM_RANGES: Record<TrafficMode, { min: number; max: number }> = {
    "no-traffic": computePMRange("no-traffic"),
    "peak-traffic": computePMRange("peak-traffic"),
};

export const DATA_PERSON_MINUTES_MAX = PM_RANGES["peak-traffic"].max;
export const DATA_PERSON_MINUTES_MIN = PM_RANGES["peak-traffic"].min;

// --- Color stop builders ---
function buildRatioStops(
    min: number,
    max: number,
): [number, number, number, number][] {
    const innerInRange = RATIO_INNER_STOPS.filter(
        ([ratio]) => ratio > min && ratio < max,
    );
    return [[min, 77, 146, 33], ...innerInRange, [max, 197, 27, 125]];
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

const RATIO_STOPS: Record<TrafficMode, [number, number, number, number][]> = {
    "no-traffic": buildRatioStops(
        RATIO_RANGES["no-traffic"].min,
        RATIO_RANGES["no-traffic"].max,
    ),
    "peak-traffic": buildRatioStops(
        RATIO_RANGES["peak-traffic"].min,
        RATIO_RANGES["peak-traffic"].max,
    ),
};

const PM_STOPS: Record<TrafficMode, [number, number, number, number][]> = {
    "no-traffic": buildPMStops(
        PM_RANGES["no-traffic"].min,
        PM_RANGES["no-traffic"].max,
    ),
    "peak-traffic": buildPMStops(
        PM_RANGES["peak-traffic"].min,
        PM_RANGES["peak-traffic"].max,
    ),
};

// Legacy export for consumers that pass a synthetic peak-traffic ratio
export const COLOR_STOPS = RATIO_STOPS["peak-traffic"];

function getStops(
    trafficMode: TrafficMode,
    metricMode: MetricMode,
): [number, number, number, number][] {
    if (metricMode === "person-minutes-lost") {
        return PM_STOPS[trafficMode];
    }
    return RATIO_STOPS[trafficMode];
}

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
    trafficMode: TrafficMode = "peak-traffic",
    metricMode: MetricMode = "travel-time-difference",
): [number, number, number] {
    const baselineCarMinutes =
        trafficMode === "peak-traffic"
            ? route.carMinutesPeak
            : (route.carMinutes ?? route.carMinutesPeak);
    let value: number;
    if (metricMode === "travel-time-difference") {
        value = route.transitMinutes / baselineCarMinutes;
    } else {
        value =
            (route.transitMinutes - baselineCarMinutes) *
            (route.dailyCommuters ?? 0);
    }
    return interpolateStops(value, getStops(trafficMode, metricMode));
}

export function getRouteColor(
    route: {
        transitMinutes: number;
        carMinutesPeak: number;
        carMinutes?: number;
        dailyCommuters?: number;
    },
    trafficMode: TrafficMode = "peak-traffic",
    metricMode: MetricMode = "travel-time-difference",
): string {
    const [r, g, b] = getRouteRgb(route, trafficMode, metricMode);
    return `rgb(${r},${g},${b})`;
}

export function buildLegendGradient(
    trafficMode: TrafficMode = "peak-traffic",
    metricMode: MetricMode = "travel-time-difference",
): string {
    const stops = getStops(trafficMode, metricMode);
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
    trafficMode: TrafficMode = "peak-traffic",
    metricMode: MetricMode = "travel-time-difference",
): string | null {
    if (metricMode === "person-minutes-lost") return null;
    const stops = getStops(trafficMode, metricMode);
    const min = stops[0][0];
    const max = stops[stops.length - 1][0];
    if (1.0 <= min || 1.0 >= max) return null;
    return `${(((1.0 - min) / (max - min)) * 100).toFixed(1)}%`;
}

/** Position of the 0 (breakeven) tick for person-minutes mode. Returns null if all routes lose time. */
export function getLegendBreakevenPct(
    trafficMode: TrafficMode = "peak-traffic",
): string | null {
    const stops = PM_STOPS[trafficMode];
    const min = stops[0][0];
    const max = stops[stops.length - 1][0];
    if (0 <= min) return null;
    return `${(((0 - min) / (max - min)) * 100).toFixed(1)}%`;
}

export function getPersonMinutesMax(
    trafficMode: TrafficMode = "peak-traffic",
): number {
    return PM_RANGES[trafficMode].max;
}

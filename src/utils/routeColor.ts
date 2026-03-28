import type { MetricMode, Route, TrafficMode } from "../types";
import { routes as fallbackRoutes } from "../data/routes";

// --- Palette shape (ratio-based modes) ---
// Interior stops define the PiYG diverging curve; endpoints are data-anchored.
const RATIO_INNER_STOPS: [number, number, number, number][] = [
    [0.85, 161, 215, 106], // medium green
    [1.0, 230, 245, 208], // pale green — equal
    [1.1, 253, 224, 239], // pale pink
    [1.8, 233, 163, 201], // medium pink
];

function computeRatioRange(
    routeList: Route[],
    trafficMode: TrafficMode,
): {
    min: number;
    max: number;
} {
    let min = Infinity,
        max = -Infinity;
    for (const r of routeList) {
        const baselineCarMinutes =
            trafficMode === "peak-traffic" ? r.carMinutesPeak : r.carMinutes;
        const ratio = r.transitMinutes / baselineCarMinutes;
        if (ratio < min) min = ratio;
        if (ratio > max) max = ratio;
    }
    return { min, max };
}

function computePMRange(routeList: Route[], trafficMode: TrafficMode): { min: number; max: number } {
    let min = Infinity,
        max = -Infinity;
    for (const r of routeList) {
        const car = trafficMode === "peak-traffic" ? r.carMinutesPeak : r.carMinutes;
        const pm = (r.transitMinutes - car) * r.dailyCommuters;
        if (pm < min) min = pm;
        if (pm > max) max = pm;
    }
    return { min, max };
}

// --- Color stop builders ---
function buildRatioStops(
    min: number,
    max: number,
): [number, number, number, number][] {
    const stops: [number, number, number, number][] = [];

    if (min >= 1.0) {
        // All routes slower than driving: pale pink at best → deep magenta at worst.
        stops.push([min, 253, 224, 239]);
        for (const [v, r, g, b] of RATIO_INNER_STOPS) {
            if (v > min && v < max) stops.push([v, r, g, b]);
        }
        stops.push([max, 197, 27, 125]);
    } else {
        // Some routes faster than driving: full diverging scale with 1.0 fixed.
        if (min < RATIO_INNER_STOPS[0][0]) {
            stops.push([min, 77, 146, 33]);
        }
        for (const [v, r, g, b] of RATIO_INNER_STOPS) {
            if (v >= min && v <= max) stops.push([v, r, g, b]);
        }
        stops.push([max, 197, 27, 125]); // always: worst route = deep magenta
    }

    return stops;
}

function buildPMStops(
    min: number,
    max: number,
): [number, number, number, number][] {
    if (min < 0 && max > 0) {
        // Diverging: green ← white → magenta
        return [
            [min, 77, 146, 33],
            [0, 255, 255, 255],
            [max, 197, 27, 125],
        ];
    }
    if (max <= 0) {
        // All routes save time: dark green → white
        return [
            [min, 77, 146, 33],
            [max, 255, 255, 255],
        ];
    }
    // All routes lose time: white → dark magenta
    return [
        [min, 255, 255, 255],
        [max, 197, 27, 125],
    ];
}

let commuterRange: { min: number; max: number } = { min: 0, max: 1 };

let ratioRanges: Record<TrafficMode, { min: number; max: number }> = {
    "no-traffic": { min: 0, max: 1 },
    "peak-traffic": { min: 0, max: 1 },
};

let pmRanges: Record<TrafficMode, { min: number; max: number }> = {
    "no-traffic": { min: 0, max: 1 },
    "peak-traffic": { min: 0, max: 1 },
};

let ratioStops: Record<TrafficMode, [number, number, number, number][]> = {
    "no-traffic": buildRatioStops(0.8, 1.4),
    "peak-traffic": buildRatioStops(0.8, 1.4),
};

let pmStops: Record<TrafficMode, [number, number, number, number][]> = {
    "no-traffic": buildPMStops(0, 1),
    "peak-traffic": buildPMStops(0, 1),
};

function rebuildScales(routeList: Route[]): void {
    if (routeList.length === 0) return;

    let cMin = Infinity, cMax = -Infinity;
    for (const r of routeList) {
        if (r.dailyCommuters < cMin) cMin = r.dailyCommuters;
        if (r.dailyCommuters > cMax) cMax = r.dailyCommuters;
    }
    commuterRange = { min: cMin, max: cMax };

    ratioRanges = {
        "no-traffic": computeRatioRange(routeList, "no-traffic"),
        "peak-traffic": computeRatioRange(routeList, "peak-traffic"),
    };

    pmRanges = {
        "no-traffic": computePMRange(routeList, "no-traffic"),
        "peak-traffic": computePMRange(routeList, "peak-traffic"),
    };

    ratioStops = {
        "no-traffic": buildRatioStops(
            ratioRanges["no-traffic"].min,
            ratioRanges["no-traffic"].max,
        ),
        "peak-traffic": buildRatioStops(
            ratioRanges["peak-traffic"].min,
            ratioRanges["peak-traffic"].max,
        ),
    };

    pmStops = {
        "no-traffic": buildPMStops(pmRanges["no-traffic"].min, pmRanges["no-traffic"].max),
        "peak-traffic": buildPMStops(pmRanges["peak-traffic"].min, pmRanges["peak-traffic"].max),
    };
}

rebuildScales(fallbackRoutes);

export function setRouteColorRoutes(routeList: Route[]): void {
    rebuildScales(routeList);
}

function getStops(
    trafficMode: TrafficMode,
    metricMode: MetricMode,
): [number, number, number, number][] {
    if (metricMode === "person-minutes-lost") {
        return pmStops[trafficMode];
    }
    return ratioStops[trafficMode];
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
    if (range <= 0) {
        const [r, g, b] = [stops[0][1], stops[0][2], stops[0][3]];
        return `linear-gradient(to right, rgb(${r},${g},${b}) 0%, rgb(${r},${g},${b}) 100%)`;
    }
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
    if (max <= min) return null;
    if (1.0 <= min || 1.0 >= max) return null;
    return `${(((1.0 - min) / (max - min)) * 100).toFixed(1)}%`;
}

/** Position of the 0 (breakeven) tick for person-minutes mode. Returns null if all routes lose time. */
export function getLegendBreakevenPct(trafficMode: TrafficMode = "peak-traffic"): string | null {
    const stops = pmStops[trafficMode];
    const min = stops[0][0];
    const max = stops[stops.length - 1][0];
    if (max <= min) return null;
    if (0 <= min) return null;
    return `${(((0 - min) / (max - min)) * 100).toFixed(1)}%`;
}

export function getCommuterRange(): { min: number; max: number } {
    return commuterRange;
}

export function getPersonMinutesMax(trafficMode: TrafficMode = "peak-traffic"): number {
    return pmRanges[trafficMode].max;
}

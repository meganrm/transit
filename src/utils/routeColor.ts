import { METRIC_MODE, TRAFFIC_MODE } from "../types";
import type { MetricMode, Route, TrafficMode } from "../types";
import { routes as fallbackRoutes } from "../data/routes";

type RGB = [number, number, number];

// Palette endpoints — the two colors at the extremes of every gradient
const COLOR_BEST: RGB = [77, 146, 33]; // dark green   — transit fastest / saves most time
const COLOR_WORST: RGB = [197, 27, 125]; // dark magenta — transit slowest / wastes most time

// Palette midpoints — used as interior stops
const COLOR_MED_GREEN: RGB = [161, 215, 106]; // medium green, ~0.85 ratio
const COLOR_NEUTRAL: RGB = [100, 100, 100]; // gray — equal / breakeven
const COLOR_MED_PINK: RGB = [233, 163, 201]; // medium pink,  ~1.8 ratio

// --- Palette shape (ratio-based modes) ---
// Interior stops define the PiYG diverging curve; endpoints are data-anchored.
const RATIO_INNER_STOPS: [number, number, number, number][] = [
    [0.85, ...COLOR_MED_GREEN],
    [1.0, ...COLOR_NEUTRAL],
    [1.8, ...COLOR_MED_PINK],
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
            trafficMode === TRAFFIC_MODE.PEAK_TRAFFIC
                ? r.carMinutesPeak
                : r.carMinutes;
        const ratio = r.transitMinutes / baselineCarMinutes;
        if (ratio < min) min = ratio;
        if (ratio > max) max = ratio;
    }
    return { min, max };
}

function computePMRange(
    routeList: Route[],
    trafficMode: TrafficMode,
): { min: number; max: number } {
    let min = Infinity,
        max = -Infinity;
    for (const r of routeList) {
        const car =
            trafficMode === TRAFFIC_MODE.PEAK_TRAFFIC
                ? r.carMinutesPeak
                : r.carMinutes;
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
        // All routes slower than driving: neutral at best → worst at worst.
        stops.push([min, ...COLOR_NEUTRAL]);
        for (const [v, r, g, b] of RATIO_INNER_STOPS) {
            if (v > min && v < max) stops.push([v, r, g, b]);
        }
        stops.push([max, ...COLOR_WORST]);
    } else {
        // Some routes faster than driving: full diverging scale with 1.0 fixed.
        if (min < RATIO_INNER_STOPS[0][0]) {
            stops.push([min, ...COLOR_BEST]);
        }
        for (const [v, r, g, b] of RATIO_INNER_STOPS) {
            if (v >= min && v <= max) stops.push([v, r, g, b]);
        }
        stops.push([max, ...COLOR_WORST]);
    }

    return stops;
}

function buildPMStops(
    min: number,
    max: number,
): [number, number, number, number][] {
    if (min < 0 && max > 0) {
        // Diverging: best ← med_green ← neutral → med_pink → worst
        return [
            [min, ...COLOR_BEST],
            [min * 0.1, ...COLOR_MED_GREEN],
            [0, ...COLOR_NEUTRAL],
            [max * 0.1, ...COLOR_MED_PINK],
            [max, ...COLOR_WORST],
        ];
    }
    if (max <= 0) {
        // All routes save time: best → med_green → neutral
        return [
            [min, ...COLOR_BEST],
            [(min + max) / 2, ...COLOR_MED_GREEN],
            [max, ...COLOR_NEUTRAL],
        ];
    }
    // All routes lose time: neutral → med_pink → worst
    return [
        [min, ...COLOR_NEUTRAL],
        [(min + max) / 2, ...COLOR_MED_PINK],
        [max, ...COLOR_WORST],
    ];
}

let commuterRange: { min: number; max: number } = { min: 0, max: 1 };

let ratioRanges: Record<TrafficMode, { min: number; max: number }> = {
    [TRAFFIC_MODE.NO_TRAFFIC]: { min: 0, max: 1 },
    [TRAFFIC_MODE.PEAK_TRAFFIC]: { min: 0, max: 1 },
};

let pmRanges: Record<TrafficMode, { min: number; max: number }> = {
    [TRAFFIC_MODE.NO_TRAFFIC]: { min: 0, max: 1 },
    [TRAFFIC_MODE.PEAK_TRAFFIC]: { min: 0, max: 1 },
};

let ratioStops: Record<TrafficMode, [number, number, number, number][]> = {
    [TRAFFIC_MODE.NO_TRAFFIC]: buildRatioStops(0.8, 1.4),
    [TRAFFIC_MODE.PEAK_TRAFFIC]: buildRatioStops(0.8, 1.4),
};

let pmStops: Record<TrafficMode, [number, number, number, number][]> = {
    [TRAFFIC_MODE.NO_TRAFFIC]: buildPMStops(0, 1),
    [TRAFFIC_MODE.PEAK_TRAFFIC]: buildPMStops(0, 1),
};

function rebuildScales(routeList: Route[]): void {
    if (routeList.length === 0) return;

    let cMin = Infinity,
        cMax = -Infinity;
    for (const r of routeList) {
        if (r.dailyCommuters < cMin) cMin = r.dailyCommuters;
        if (r.dailyCommuters > cMax) cMax = r.dailyCommuters;
    }
    commuterRange = { min: cMin, max: cMax };

    ratioRanges = {
        [TRAFFIC_MODE.NO_TRAFFIC]: computeRatioRange(
            routeList,
            TRAFFIC_MODE.NO_TRAFFIC,
        ),
        [TRAFFIC_MODE.PEAK_TRAFFIC]: computeRatioRange(
            routeList,
            TRAFFIC_MODE.PEAK_TRAFFIC,
        ),
    };

    pmRanges = {
        [TRAFFIC_MODE.NO_TRAFFIC]: computePMRange(
            routeList,
            TRAFFIC_MODE.NO_TRAFFIC,
        ),
        [TRAFFIC_MODE.PEAK_TRAFFIC]: computePMRange(
            routeList,
            TRAFFIC_MODE.PEAK_TRAFFIC,
        ),
    };

    ratioStops = {
        [TRAFFIC_MODE.NO_TRAFFIC]: buildRatioStops(
            ratioRanges[TRAFFIC_MODE.NO_TRAFFIC].min,
            ratioRanges[TRAFFIC_MODE.NO_TRAFFIC].max,
        ),
        [TRAFFIC_MODE.PEAK_TRAFFIC]: buildRatioStops(
            ratioRanges[TRAFFIC_MODE.PEAK_TRAFFIC].min,
            ratioRanges[TRAFFIC_MODE.PEAK_TRAFFIC].max,
        ),
    };

    pmStops = {
        [TRAFFIC_MODE.NO_TRAFFIC]: buildPMStops(
            pmRanges[TRAFFIC_MODE.NO_TRAFFIC].min,
            pmRanges[TRAFFIC_MODE.NO_TRAFFIC].max,
        ),
        [TRAFFIC_MODE.PEAK_TRAFFIC]: buildPMStops(
            pmRanges[TRAFFIC_MODE.PEAK_TRAFFIC].min,
            pmRanges[TRAFFIC_MODE.PEAK_TRAFFIC].max,
        ),
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
    if (metricMode === METRIC_MODE.PERSON_MINUTES_LOST) {
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
    trafficMode: TrafficMode = TRAFFIC_MODE.PEAK_TRAFFIC,
    metricMode: MetricMode = METRIC_MODE.TRAVEL_TIME_DIFFERENCE,
): [number, number, number] {
    const baselineCarMinutes =
        trafficMode === TRAFFIC_MODE.PEAK_TRAFFIC
            ? route.carMinutesPeak
            : (route.carMinutes ?? route.carMinutesPeak);
    let value: number;
    if (metricMode === METRIC_MODE.TRAVEL_TIME_DIFFERENCE) {
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
    trafficMode: TrafficMode = TRAFFIC_MODE.PEAK_TRAFFIC,
    metricMode: MetricMode = METRIC_MODE.TRAVEL_TIME_DIFFERENCE,
): string {
    const [r, g, b] = getRouteRgb(route, trafficMode, metricMode);
    return `rgb(${r},${g},${b})`;
}

export function buildLegendGradient(
    trafficMode: TrafficMode = TRAFFIC_MODE.PEAK_TRAFFIC,
    metricMode: MetricMode = METRIC_MODE.TRAVEL_TIME_DIFFERENCE,
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
    trafficMode: TrafficMode = TRAFFIC_MODE.PEAK_TRAFFIC,
    metricMode: MetricMode = METRIC_MODE.TRAVEL_TIME_DIFFERENCE,
): string | null {
    if (metricMode === METRIC_MODE.PERSON_MINUTES_LOST) return null;
    const stops = getStops(trafficMode, metricMode);
    const min = stops[0][0];
    const max = stops[stops.length - 1][0];
    if (max <= min) return null;
    if (1.0 <= min || 1.0 >= max) return null;
    return `${(((1.0 - min) / (max - min)) * 100).toFixed(1)}%`;
}

/** Position of the 0 (breakeven) tick for person-minutes mode. Returns null if all routes lose time. */
export function getLegendBreakevenPct(
    trafficMode: TrafficMode = TRAFFIC_MODE.PEAK_TRAFFIC,
): string | null {
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

export function getPersonMinutesMax(
    trafficMode: TrafficMode = TRAFFIC_MODE.PEAK_TRAFFIC,
): number {
    return pmRanges[trafficMode].max;
}

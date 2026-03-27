import type { Route } from "../types";

export interface RouteMetric {
    routeId: number;
    personMinutesLost: number;
}

export interface NeighborhoodMetric {
    neighborhood: string;
    personMinutesLost: number;
}

/** Per-route person-minutes lost. Positive = transit worse than peak car. */
export function getRouteMetrics(routes: Route[]): RouteMetric[] {
    return routes
        .map((r) => ({
            routeId: r.id,
            personMinutesLost:
                (r.transitMinutes - r.carMinutesPeak) * r.dailyCommuters,
        }))
        .sort((a, b) => b.personMinutesLost - a.personMinutesLost);
}

/** Min and max transit/peak-car ratio across all routes. */
export function getDataRatioRange(routes: Route[]): { min: number; max: number } {
    let min = Infinity,
        max = -Infinity;
    for (const r of routes) {
        const ratio = r.transitMinutes / r.carMinutesPeak;
        if (ratio < min) min = ratio;
        if (ratio > max) max = ratio;
    }
    return { min, max };
}

/** Aggregated person-minutes lost per origin neighborhood. */
export function getNeighborhoodMetrics(routes: Route[]): NeighborhoodMetric[] {
    const map = new Map<string, number>();
    for (const r of routes) {
        const origin = r.name.split(" → ")[0].trim();
        map.set(
            origin,
            (map.get(origin) ?? 0) +
                (r.transitMinutes - r.carMinutesPeak) * r.dailyCommuters,
        );
    }
    return Array.from(map.entries())
        .map(([neighborhood, personMinutesLost]) => ({
            neighborhood,
            personMinutesLost,
        }))
        .sort((a, b) => b.personMinutesLost - a.personMinutesLost);
}

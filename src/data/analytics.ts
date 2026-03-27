import type { Route } from "../types";

export interface NeighborhoodDetail {
    neighborhood: string;
    fromRoutes: Route[];
    toRoutes: Route[];
    totalCommuters: number;
    totalPersonMinutesLost: number;
    avgRatio: number;
}

export function getNeighborhoodDetail(
    allRoutes: Route[],
    neighborhood: string,
    routeIds: Set<number>,
): NeighborhoodDetail {
    const matching = allRoutes.filter((r) => routeIds.has(r.id));

    const fromRoutes = matching.filter((r) => {
        const origin = r.name.split(" → ")[0].trim();
        return (
            origin === neighborhood ||
            neighborhood.includes(origin) ||
            origin.includes(neighborhood)
        );
    });
    const toRoutes = matching.filter((r) => !fromRoutes.includes(r));

    const totalCommuters = matching.reduce((s, r) => s + r.dailyCommuters, 0);
    const totalPersonMinutesLost = matching.reduce(
        (s, r) => s + (r.transitMinutes - r.carMinutesPeak) * r.dailyCommuters,
        0,
    );
    const avgRatio =
        totalCommuters > 0
            ? matching.reduce(
                  (s, r) =>
                      s +
                      (r.transitMinutes / r.carMinutesPeak) * r.dailyCommuters,
                  0,
              ) / totalCommuters
            : 1;

    return {
        neighborhood,
        fromRoutes,
        toRoutes,
        totalCommuters,
        totalPersonMinutesLost,
        avgRatio,
    };
}

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

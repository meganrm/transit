import type { Route, TrafficMode } from "../types";
import { TRAFFIC_MODE } from "../types";
import { ui } from "../constants";

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
    trafficMode: TrafficMode,
): NeighborhoodDetail {
    const matching = allRoutes.filter((r) => routeIds.has(r.id));

    const fromRoutes = matching.filter((r) => {
        const origin = r.name.split(ui.routeNameSeparator)[0].trim();
        return (
            origin === neighborhood ||
            neighborhood.includes(origin) ||
            origin.includes(neighborhood)
        );
    });
    const toRoutes = matching.filter((r) => !fromRoutes.includes(r));

    const totalCommuters = matching.reduce((s, r) => s + r.dailyCommuters, 0);
    const totalPersonMinutesLost = matching.reduce((s, r) => {
        const car =
            trafficMode === TRAFFIC_MODE.PEAK_TRAFFIC
                ? r.carMinutesPeak
                : r.carMinutes;
        return s + (r.transitMinutes - car) * r.dailyCommuters;
    }, 0);
    const avgRatio =
        totalCommuters > 0
            ? matching.reduce((s, r) => {
                  const car =
                      trafficMode === TRAFFIC_MODE.PEAK_TRAFFIC
                          ? r.carMinutesPeak
                          : r.carMinutes;
                  return s + (r.transitMinutes / car) * r.dailyCommuters;
              }, 0) / totalCommuters
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
    avgRatio: number;
}

/** Per-route person-minutes lost. Positive = transit worse than driving baseline. */
export function getRouteMetrics(
    routes: Route[],
    trafficMode: TrafficMode,
): RouteMetric[] {
    return routes
        .map((r) => {
            const car =
                trafficMode === TRAFFIC_MODE.PEAK_TRAFFIC
                    ? r.carMinutesPeak
                    : r.carMinutes;
            return {
                routeId: r.id,
                personMinutesLost: (r.transitMinutes - car) * r.dailyCommuters,
            };
        })
        .sort((a, b) => b.personMinutesLost - a.personMinutesLost);
}

/** Min and max transit/peak-car ratio across all routes. */
export function getDataRatioRange(routes: Route[]): {
    min: number;
    max: number;
} {
    let min = Infinity,
        max = -Infinity;
    for (const r of routes) {
        const ratio = r.transitMinutes / r.carMinutesPeak;
        if (ratio < min) min = ratio;
        if (ratio > max) max = ratio;
    }
    return { min, max };
}

/** Commuter-weighted average transit/car ratio per origin neighborhood. */
export function getNeighborhoodMetrics(
    routes: Route[],
    trafficMode: TrafficMode,
): NeighborhoodMetric[] {
    const ratioSum = new Map<string, number>();
    const commuterSum = new Map<string, number>();
    for (const r of routes) {
        const origin = r.name.split(ui.routeNameSeparator)[0].trim();
        const car =
            trafficMode === TRAFFIC_MODE.PEAK_TRAFFIC
                ? r.carMinutesPeak
                : r.carMinutes;
        const ratio = r.transitMinutes / car;
        ratioSum.set(
            origin,
            (ratioSum.get(origin) ?? 0) + ratio * r.dailyCommuters,
        );
        commuterSum.set(
            origin,
            (commuterSum.get(origin) ?? 0) + r.dailyCommuters,
        );
    }
    return Array.from(ratioSum.entries())
        .map(([neighborhood, wSum]) => ({
            neighborhood,
            avgRatio: wSum / (commuterSum.get(neighborhood) ?? 1),
        }))
        .sort((a, b) => b.avgRatio - a.avgRatio);
}

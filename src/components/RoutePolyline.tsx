import { Polyline } from "react-leaflet";
import L from "leaflet";
import type { MetricMode, Route, TrafficMode } from "../types";
import { weightScale } from "../constants";
import { getRouteColor, getPersonMinutesMax } from "../utils/routeColor";

interface Props {
    route: Route;
    isActive: boolean;
    isDimmed: boolean;
    trafficMode: TrafficMode;
    metricMode: MetricMode;
    onHover: (id: number | null) => void;
    onRouteClick: (id: number) => void;
}

function getRouteWeight(dailyCommuters: number): number {
    const t = Math.min(
        1,
        Math.max(
            0,
            (dailyCommuters - weightScale.minCommuters) /
                (weightScale.maxCommuters - weightScale.minCommuters),
        ),
    );
    return (
        weightScale.minWeight +
        t * (weightScale.maxWeight - weightScale.minWeight)
    );
}

function getPersonMinutesWeight(
    route: Route,
    trafficMode: TrafficMode,
): number {
    const baselineCarMinutes =
        trafficMode === "peak-traffic"
            ? route.carMinutesPeak
            : route.carMinutes;
    const pm = Math.max(
        0,
        (route.transitMinutes - baselineCarMinutes) * route.dailyCommuters,
    );
    const t = Math.min(1, pm / getPersonMinutesMax(trafficMode));
    return (
        weightScale.minWeight +
        t * (weightScale.maxWeight - weightScale.minWeight)
    );
}

export function RoutePolyline({
    route,
    isActive,
    isDimmed,
    trafficMode,
    metricMode,
    onHover,
    onRouteClick,
}: Props) {
    const color = getRouteColor(route, trafficMode, metricMode);
    const baseWeight =
        metricMode === "person-minutes-lost"
            ? getPersonMinutesWeight(route, trafficMode)
            : getRouteWeight(route.dailyCommuters);
    const weight = isActive ? baseWeight + weightScale.hoverBoost : baseWeight;
    const opacity = isDimmed ? 0.3 : isActive ? 1 : 0.75;

    return (
        <Polyline
            positions={route.coordinates}
            pathOptions={{ color, weight, opacity }}
            eventHandlers={{
                mouseover: () => onHover(route.id),
                mouseout: () => onHover(null),
                click: (e) => {
                    L.DomEvent.stopPropagation(e.originalEvent);
                    onRouteClick(route.id);
                },
            }}
        />
    );
}

import { Polyline } from "react-leaflet";
import L from "leaflet";
import { METRIC_MODE, TRAFFIC_MODE } from "../types";
import type { MetricMode, Route, TrafficMode } from "../types";
import { weightScale } from "../constants";
import {
    getRouteColor,
    getPersonMinutesMax,
    getCommuterRange,
} from "../utils/routeColor";

interface Props {
    route: Route;
    isActive: boolean;
    isDimmed: boolean;
    focusActive: boolean;
    trafficMode: TrafficMode;
    metricMode: MetricMode;
    onHover: (id: number | null) => void;
    onRouteClick: (id: number) => void;
}

function getRouteWeight(dailyCommuters: number): number {
    const { min, max } = getCommuterRange();
    const t =
        max > min
            ? Math.min(1, Math.max(0, (dailyCommuters - min) / (max - min)))
            : 0.5;
    return (
        weightScale.minWeight +
        t * (weightScale.maxWeight - weightScale.minWeight)
    );
}

function getPersonMinutesWeight(
    route: Route,
    trafficMode: TrafficMode,
): number {
    const car =
        trafficMode === TRAFFIC_MODE.PEAK_TRAFFIC
            ? route.carMinutesPeak
            : route.carMinutes;
    const pm = Math.max(0, (route.transitMinutes - car) * route.dailyCommuters);
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
    focusActive,
    trafficMode,
    metricMode,
    onHover,
    onRouteClick,
}: Props) {
    const color = getRouteColor(route, trafficMode, metricMode);
    const baseWeight =
        metricMode === METRIC_MODE.PERSON_MINUTES_LOST
            ? getPersonMinutesWeight(route, trafficMode)
            : getRouteWeight(route.dailyCommuters);
    const weight = isActive ? baseWeight + weightScale.hoverBoost : baseWeight;
    const opacity = isActive
        ? 1
        : isDimmed
          ? 0.1
          : focusActive
            ? 0.75
            : route.supplemental
              ? 0.1
              : 0.2;

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

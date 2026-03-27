import { Polyline } from "react-leaflet";
import L from "leaflet";
import type { Route, ColorMode } from "../types";
import { weightScale } from "../constants";
import { getRouteColor, DATA_PERSON_MINUTES_MAX } from "../utils/routeColor";

interface Props {
    route: Route;
    isActive: boolean;
    isDimmed: boolean;
    colorMode: ColorMode;
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

function getPersonMinutesWeight(route: Route): number {
    const pm = Math.max(
        0,
        (route.transitMinutes - route.carMinutesPeak) * route.dailyCommuters,
    );
    const t = Math.min(1, pm / DATA_PERSON_MINUTES_MAX);
    return (
        weightScale.minWeight +
        t * (weightScale.maxWeight - weightScale.minWeight)
    );
}

export function RoutePolyline({
    route,
    isActive,
    isDimmed,
    colorMode,
    onHover,
    onRouteClick,
}: Props) {
    const color = getRouteColor(route, colorMode);
    const baseWeight =
        colorMode === "person-minutes"
            ? getPersonMinutesWeight(route)
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

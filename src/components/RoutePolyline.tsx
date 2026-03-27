import { Polyline } from "react-leaflet";
import type { Route } from "../types";
import { weightScale } from "../constants";
import { getRouteColor } from "../utils/routeColor";

interface Props {
    route: Route;
    isActive: boolean;
    isDimmed: boolean;
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

export function RoutePolyline({
    route,
    isActive,
    isDimmed,
    onHover,
    onRouteClick,
}: Props) {
    const color = getRouteColor(route);
    const baseWeight = getRouteWeight(route.dailyCommuters);
    const weight = isActive ? baseWeight + weightScale.hoverBoost : baseWeight;
    const opacity = isDimmed ? 0.3 : isActive ? 1 : 0.75;

    return (
        <Polyline
            positions={route.coordinates}
            pathOptions={{ color, weight, opacity }}
            eventHandlers={{
                mouseover: () => onHover(route.id),
                mouseout: () => onHover(null),
                click: () => onRouteClick(route.id),
            }}
        />
    );
}

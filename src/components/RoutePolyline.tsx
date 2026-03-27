import { Polyline, Popup } from "react-leaflet";
import type { Route } from "../types";
import { RoutePopup } from "./RoutePopup";
import { routeColors, ratioThresholds, weightScale } from "../constants";

function getRouteColor(route: Route): string {
    const ratio = route.transitMinutes / route.carMinutes;
    if (ratio <= ratioThresholds.equal) return routeColors.green;
    if (ratio <= ratioThresholds.moderate) return routeColors.yellow;
    return routeColors.red;
}

interface Props {
    route: Route;
    isActive: boolean;
    isDimmed: boolean;
    onHover: (id: number | null) => void;
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

export function RoutePolyline({ route, isActive, isDimmed, onHover }: Props) {
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
            }}
        >
            <Popup minWidth={280} maxWidth={320}>
                <RoutePopup route={route} />
            </Popup>
        </Polyline>
    );
}

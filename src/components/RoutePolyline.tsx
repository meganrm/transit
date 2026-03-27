import { Polyline, Popup } from "react-leaflet";
import type { Route } from "../types";
import { RoutePopup } from "./RoutePopup";

function getRouteColor(route: Route): string {
    const ratio = route.transitMinutes / route.carMinutes;
    if (ratio <= 1) return "#22c55e"; // green — transit faster or equal
    if (ratio <= 1.5) return "#eab308"; // yellow — transit up to 50% slower
    return "#ef4444"; // red — transit >50% slower
}

interface Props {
    route: Route;
    isActive: boolean;
    isDimmed: boolean;
    onHover: (id: number | null) => void;
}

const MIN_WEIGHT = 2;
const MAX_WEIGHT = 8;
const MIN_COMMUTERS = 4000;
const MAX_COMMUTERS = 22000;

function getRouteWeight(dailyCommuters: number): number {
    const t = Math.min(
        1,
        Math.max(
            0,
            (dailyCommuters - MIN_COMMUTERS) / (MAX_COMMUTERS - MIN_COMMUTERS),
        ),
    );
    return MIN_WEIGHT + t * (MAX_WEIGHT - MIN_WEIGHT);
}

export function RoutePolyline({ route, isActive, isDimmed, onHover }: Props) {
    const color = getRouteColor(route);
    const baseWeight = getRouteWeight(route.dailyCommuters);
    const weight = isActive ? baseWeight + 3 : baseWeight;
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

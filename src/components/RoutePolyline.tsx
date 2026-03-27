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

export function RoutePolyline({ route, isActive, isDimmed, onHover }: Props) {
    const color = getRouteColor(route);
    const weight = isActive ? 7 : 4;
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

import { Marker, CircleMarker } from "react-leaflet";
import L from "leaflet";
import { destinations } from "../data/destinations";
import { routes } from "../data/routes";
import { theme } from "../constants";
import { useMemo } from "react";

function createLabelIcon(name: string, highlighted: boolean) {
    const cls = highlighted
        ? "destination-label highlighted"
        : "destination-label";
    return L.divIcon({
        className: cls,
        html: `<span>${name}</span>`,
        iconSize: [0, 0],
        iconAnchor: [0, 0],
    });
}

/** Map destination names to the route IDs that touch them. */
function buildDestRouteMap() {
    const map = new Map<string, Set<number>>();
    for (const route of routes) {
        const parts = route.name.split(" → ");
        for (const part of parts) {
            const trimmed = part.trim();
            // Match against destination names (some have aliases like "SoDo / Industrial District")
            for (const dest of destinations) {
                if (
                    trimmed === dest.name ||
                    dest.name.includes(trimmed) ||
                    trimmed.includes(dest.name)
                ) {
                    if (!map.has(dest.name)) map.set(dest.name, new Set());
                    map.get(dest.name)!.add(route.id);
                }
            }
        }
    }
    return map;
}

interface Props {
    activeRouteId: number | null;
}

export function DestinationLabels({ activeRouteId }: Props) {
    const destRouteMap = useMemo(buildDestRouteMap, []);

    return (
        <>
            {destinations.map((dest) => {
                const routeIds = destRouteMap.get(dest.name);
                const highlighted =
                    activeRouteId !== null &&
                    routeIds !== undefined &&
                    routeIds.has(activeRouteId);

                return (
                    <span key={dest.name}>
                        <CircleMarker
                            center={dest.position}
                            radius={highlighted ? 5 : 3}
                            pathOptions={{
                                color: highlighted
                                    ? theme.textBright
                                    : theme.textDim,
                                fillColor: highlighted
                                    ? theme.textBright
                                    : theme.textSecondary,
                                fillOpacity: highlighted ? 1 : 0.6,
                                weight: highlighted ? 2 : 1,
                            }}
                            interactive={false}
                        />
                        <Marker
                            position={dest.position}
                            icon={createLabelIcon(dest.name, highlighted)}
                            interactive={false}
                        />
                    </span>
                );
            })}
        </>
    );
}

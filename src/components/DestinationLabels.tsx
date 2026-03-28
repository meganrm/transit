import { Marker, CircleMarker } from "react-leaflet";
import type { LeafletMouseEvent, LatLngExpression } from "leaflet";
import L from "leaflet";
import { theme } from "../constants";
import type { Route, TrafficMode } from "../types";
import { useMemo, useState } from "react";
import { getRouteRgb } from "../utils/routeColor";

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

function extractHubs(routes: Route[]): { name: string; position: LatLngExpression }[] {
    const seen = new Map<string, LatLngExpression>();
    for (const route of routes) {
        const parts = route.name.split(" → ").map((s) => s.trim());
        if (parts[0] && !seen.has(parts[0])) {
            seen.set(parts[0], route.coordinates[0]);
        }
        if (parts[1] && !seen.has(parts[1])) {
            seen.set(parts[1], route.coordinates[route.coordinates.length - 1]);
        }
    }
    return [...seen.entries()].map(([name, position]) => ({ name, position }));
}

/** Map hub names to the route IDs that touch them (both origin and destination). */
function buildDestRouteMap(routes: Route[]): Map<string, Set<number>> {
    const map = new Map<string, Set<number>>();
    for (const route of routes) {
        for (const name of route.name.split(" → ").map((s) => s.trim())) {
            if (!name) continue;
            if (!map.has(name)) map.set(name, new Set());
            map.get(name)!.add(route.id);
        }
    }
    return map;
}

function ratioToColor(ratio: number, trafficMode: TrafficMode): string {
    // Treat avgRatio as if it were transitMinutes/carMinutes directly
    const [r, g, b] = getRouteRgb(
        { transitMinutes: ratio, carMinutesPeak: 1, carMinutes: 1 },
        trafficMode,
        "travel-time-difference",
    );
    return `rgb(${r},${g},${b})`;
}

interface Props {
    routes: Route[];
    activeRouteId: number | null;
    neighborhoodScores: Map<string, number> | null;
    trafficMode: TrafficMode;
    selectedNeighborhood: string | null;
    onNeighborhoodSelect: (name: string | null, routeIds?: Set<number>) => void;
}

export function DestinationLabels({
    routes,
    activeRouteId,
    neighborhoodScores,
    trafficMode,
    selectedNeighborhood,
    onNeighborhoodSelect,
}: Props) {
    const hubs = useMemo(() => extractHubs(routes), [routes]);
    const destRouteMap = useMemo(() => buildDestRouteMap(routes), [routes]);
    const [hoveredDest, setHoveredDest] = useState<string | null>(null);

    return (
        <>
            {hubs.map((dest) => {
                const touchingRouteIds = destRouteMap.get(dest.name);
                const isSelected = selectedNeighborhood === dest.name;
                const isHovered = hoveredDest === dest.name && !isSelected;
                const highlighted =
                    isSelected ||
                    isHovered ||
                    (activeRouteId !== null &&
                        touchingRouteIds !== undefined &&
                        touchingRouteIds.has(activeRouteId));

                const score = neighborhoodScores?.get(dest.name) ?? null;
                const useScoreColor =
                    !isSelected && !isHovered && neighborhoodScores !== null && score !== null;

                const dotColor = isSelected
                    ? theme.textBright
                    : isHovered
                      ? theme.textBright
                      : useScoreColor
                        ? ratioToColor(score!, trafficMode)
                        : highlighted
                          ? theme.textBright
                          : theme.textSecondary;

                const dotRadius = isSelected
                    ? 8
                    : isHovered
                      ? 7
                      : useScoreColor
                        ? 4 + Math.min(4, (Math.abs(score! - 1.0) / 3) * 4)
                        : highlighted
                          ? 6
                          : 4;

                const handlers = {
                    mouseover: () => setHoveredDest(dest.name),
                    mouseout: () => setHoveredDest(null),
                    click: (e: LeafletMouseEvent) => {
                        L.DomEvent.stopPropagation(e.originalEvent);
                        if (isSelected) {
                            onNeighborhoodSelect(null);
                        } else {
                            onNeighborhoodSelect(
                                dest.name,
                                touchingRouteIds ?? new Set<number>(),
                            );
                        }
                    },
                };

                return (
                    <span key={dest.name}>
                        <CircleMarker
                            center={dest.position}
                            radius={dotRadius}
                            pathOptions={{
                                color: isSelected
                                    ? "#ffffff"
                                    : isHovered
                                      ? "#ffffff"
                                      : useScoreColor
                                        ? dotColor
                                        : highlighted
                                          ? theme.textBright
                                          : theme.textDim,
                                fillColor: dotColor,
                                fillOpacity: isSelected
                                    ? 0.35
                                    : isHovered
                                      ? 1
                                      : useScoreColor
                                        ? 0.9
                                        : highlighted
                                          ? 1
                                          : 0.65,
                                weight: isSelected ? 2.5 : isHovered ? 2.5 : 1,
                            }}
                            interactive={true}
                            eventHandlers={handlers}
                        />
                        <Marker
                            position={dest.position}
                            icon={createLabelIcon(dest.name, highlighted || isHovered)}
                            interactive={true}
                            eventHandlers={handlers}
                        />
                    </span>
                );
            })}
        </>
    );
}

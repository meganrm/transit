import { Marker, CircleMarker } from "react-leaflet";
import type { LeafletMouseEvent } from "leaflet";
import L from "leaflet";
import { destinations } from "../data/destinations";
import { routes } from "../data/routes";
import { theme } from "../constants";
import { useMemo, useState } from "react";

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

/** Map destination names to the route IDs that touch them (both origin and destination). */
function buildDestRouteMap() {
    const map = new Map<string, Set<number>>();
    for (const route of routes) {
        const parts = route.name.split(" → ");
        for (const part of parts) {
            const trimmed = part.trim();
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

function scoreToColor(score: number, maxScore: number): string {
    if (score <= 0 || maxScore <= 0) return theme.textDim;
    const t = Math.min(1, score / maxScore);
    const r = Math.round(253 + t * (197 - 253));
    const g = Math.round(224 + t * (27 - 224));
    const b = Math.round(239 + t * (125 - 239));
    return `rgb(${r},${g},${b})`;
}

interface Props {
    activeRouteId: number | null;
    neighborhoodScores: Map<string, number> | null;
    selectedNeighborhood: string | null;
    onNeighborhoodSelect: (name: string | null, routeIds?: Set<number>) => void;
}

export function DestinationLabels({
    activeRouteId,
    neighborhoodScores,
    selectedNeighborhood,
    onNeighborhoodSelect,
}: Props) {
    const destRouteMap = useMemo(buildDestRouteMap, []);
    const [hoveredDest, setHoveredDest] = useState<string | null>(null);

    const maxScore = useMemo(() => {
        if (!neighborhoodScores) return 0;
        let max = 0;
        for (const v of neighborhoodScores.values()) {
            if (v > max) max = v;
        }
        return max;
    }, [neighborhoodScores]);

    return (
        <>
            {destinations.map((dest) => {
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
                        ? scoreToColor(score!, maxScore)
                        : highlighted
                          ? theme.textBright
                          : theme.textSecondary;

                const dotRadius = isSelected
                    ? 8
                    : isHovered
                      ? 7
                      : useScoreColor
                        ? 4 + Math.min(4, (Math.max(0, score!) / maxScore) * 4)
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

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
}

export function DestinationLabels({ activeRouteId, neighborhoodScores }: Props) {
    const destRouteMap = useMemo(buildDestRouteMap, []);

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
                const routeIds = destRouteMap.get(dest.name);
                const highlighted =
                    activeRouteId !== null &&
                    routeIds !== undefined &&
                    routeIds.has(activeRouteId);

                const score = neighborhoodScores?.get(dest.name) ?? null;
                const useScoreColor = neighborhoodScores !== null && score !== null;
                const dotColor = useScoreColor
                    ? scoreToColor(score!, maxScore)
                    : highlighted
                      ? theme.textBright
                      : theme.textSecondary;
                const dotRadius = useScoreColor
                    ? 3 + Math.min(5, (Math.max(0, score!) / maxScore) * 5)
                    : highlighted
                      ? 5
                      : 3;

                return (
                    <span key={dest.name}>
                        <CircleMarker
                            center={dest.position}
                            radius={dotRadius}
                            pathOptions={{
                                color: useScoreColor ? dotColor : highlighted ? theme.textBright : theme.textDim,
                                fillColor: dotColor,
                                fillOpacity: useScoreColor ? 0.9 : highlighted ? 1 : 0.6,
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

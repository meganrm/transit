import { MapContainer, TileLayer, useMap, useMapEvents } from "react-leaflet";
import L from "leaflet";
import { RoutePolyline } from "./RoutePolyline";
import { DestinationLabels } from "./DestinationLabels";
import { Legend } from "./Legend";
import { ViewToggle } from "./ViewToggle";
import type { ViewMode } from "./ViewToggle";
import { METRIC_MODE, TRAFFIC_MODE } from "../types";
import type { MetricMode, TrafficMode } from "../types";
import type { Route } from "../types";
import { useState, useEffect, useRef, useMemo } from "react";
import { HOME_BOUNDS, HOME_PADDING } from "../homeView";
import { getRouteMetrics, getNeighborhoodMetrics } from "../data/analytics";

const homeBounds = L.latLngBounds(HOME_BOUNDS[0], HOME_BOUNDS[1]);

interface HomeState {
    lat: number;
    lng: number;
    zoom: number;
}

function FitBounds({
    homeRef,
}: {
    homeRef: React.RefObject<HomeState | null>;
}) {
    const map = useMap();
    const fitted = useRef(false);
    useEffect(() => {
        if (fitted.current) return;
        fitted.current = true;
        map.fitBounds(homeBounds, {
            padding: [HOME_PADDING, HOME_PADDING],
            animate: false,
        });
        const c = map.getCenter();
        homeRef.current = { lat: c.lat, lng: c.lng, zoom: map.getZoom() };
    }, [map, homeRef]);
    return null;
}

function MapClickClear({ onClear }: { onClear: () => void }) {
    useMapEvents({
        click: (event) => {
            const target = event.originalEvent.target;
            if (
                target instanceof Element &&
                target.closest(".leaflet-interactive")
            ) {
                return;
            }
            onClear();
        },
    });
    return null;
}

function HomeButton({
    homeRef,
}: {
    homeRef: React.RefObject<HomeState | null>;
}) {
    const map = useMap();
    return (
        <button
            className="home-button"
            title="Reset view"
            onClick={() => {
                if (!homeRef.current) return;
                const { lat, lng, zoom } = homeRef.current;
                map.setView([lat, lng], zoom, { animate: false });
            }}
        >
            <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
            >
                <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
                <polyline points="9 22 9 12 15 12 15 22" />
            </svg>
        </button>
    );
}

interface MapViewProps {
    routes: Route[];
    onRouteSelect: (id: number) => void;
    viewMode: ViewMode;
    onViewModeChange: (mode: ViewMode) => void;
    trafficMode: TrafficMode;
    onTrafficModeChange: (mode: TrafficMode) => void;
    metricMode: MetricMode;
    onMetricModeChange: (mode: MetricMode) => void;
    routeCount: number;
    onClearSelection: () => void;
    worstCount: number;
    onWorstCountChange: (count: number) => void;
    bestCount: number;
    onBestCountChange: (count: number) => void;
    selectedNeighborhood: string | null;
    selectedNeighborhoodRouteIds: Set<number> | null;
    onNeighborhoodSelect: (name: string | null, routeIds?: Set<number>) => void;
}

export function MapView({
    routes,
    onRouteSelect,
    viewMode,
    onViewModeChange,
    trafficMode,
    onTrafficModeChange,
    metricMode,
    onMetricModeChange,
    routeCount,
    onClearSelection,
    worstCount,
    onWorstCountChange,
    bestCount,
    onBestCountChange,
    selectedNeighborhood,
    selectedNeighborhoodRouteIds,
    onNeighborhoodSelect,
}: MapViewProps) {
    const [activeRouteId, setActiveRouteId] = useState<number | null>(null);
    const homeRef = useRef<HomeState | null>(null);

    const highlightedRouteIds = useMemo<Set<number> | null>(() => {
        if (selectedNeighborhoodRouteIds !== null)
            return selectedNeighborhoodRouteIds;
        if (worstCount === 0 && bestCount === 0) return null;

        let sortedAsc: Route[];
        if (metricMode === METRIC_MODE.PERSON_MINUTES_LOST) {
            const metrics = getRouteMetrics(routes, trafficMode);
            sortedAsc = metrics
                .map((m) => routes.find((r) => r.id === m.routeId)!)
                .reverse();
        } else {
            const carFn = (r: Route) =>
                trafficMode === TRAFFIC_MODE.PEAK_TRAFFIC
                    ? r.carMinutesPeak
                    : r.carMinutes;
            sortedAsc = [...routes].sort(
                (a, b) =>
                    a.transitMinutes / carFn(a) - b.transitMinutes / carFn(b),
            );
        }

        const ids = new Set<number>();
        sortedAsc.slice(0, bestCount).forEach((r) => ids.add(r.id));
        sortedAsc
            .slice(sortedAsc.length - worstCount)
            .forEach((r) => ids.add(r.id));
        return ids.size > 0 ? ids : null;
    }, [
        routes,
        selectedNeighborhoodRouteIds,
        worstCount,
        bestCount,
        trafficMode,
        metricMode,
    ]);

    const neighborhoodScores = useMemo<Map<string, number> | null>(() => {
        const metrics = getNeighborhoodMetrics(routes, trafficMode);
        const map = new Map<string, number>();
        for (const m of metrics) {
            map.set(m.neighborhood, m.avgRatio);
        }
        return map;
    }, [routes, trafficMode]);

    return (
        <div style={{ height: "100%", width: "100%", position: "relative" }}>
            <MapContainer
                center={HOME_BOUNDS[0]}
                zoom={11}
                zoomSnap={0}
                style={{ height: "100%", width: "100%" }}
                zoomControl={true}
            >
                <FitBounds homeRef={homeRef} />
                <HomeButton homeRef={homeRef} />
                <MapClickClear onClear={onClearSelection} />
                <TileLayer
                    attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/">CARTO</a>'
                    url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
                />
                {routes.map((route) => (
                    <RoutePolyline
                        key={route.id}
                        route={route}
                        isActive={activeRouteId === route.id}
                        isDimmed={
                            highlightedRouteIds !== null &&
                            !highlightedRouteIds.has(route.id)
                        }
                        focusActive={highlightedRouteIds !== null}
                        trafficMode={trafficMode}
                        metricMode={metricMode}
                        onHover={setActiveRouteId}
                        onRouteClick={onRouteSelect}
                    />
                ))}
                <DestinationLabels
                    routes={routes}
                    activeRouteId={activeRouteId}
                    highlightedRouteIds={highlightedRouteIds}
                    neighborhoodScores={neighborhoodScores}
                    trafficMode={trafficMode}
                    selectedNeighborhood={selectedNeighborhood}
                    onNeighborhoodSelect={onNeighborhoodSelect}
                />
            </MapContainer>
            <Legend
                trafficMode={trafficMode}
                onTrafficModeChange={onTrafficModeChange}
                metricMode={metricMode}
                onMetricModeChange={onMetricModeChange}
                routeCount={routeCount}
                worstCount={worstCount}
                onWorstCountChange={onWorstCountChange}
                bestCount={bestCount}
                onBestCountChange={onBestCountChange}
            />
            <ViewToggle viewMode={viewMode} onChange={onViewModeChange} />
        </div>
    );
}

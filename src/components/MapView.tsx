import { MapContainer, TileLayer, useMap, useMapEvents } from "react-leaflet";
import L from "leaflet";
import { RoutePolyline } from "./RoutePolyline";
import { DestinationLabels } from "./DestinationLabels";
import { Legend } from "./Legend";
import type { MetricMode, TrafficMode } from "../types";
import type { Route } from "../types";
import { useState, useEffect, useRef, useMemo } from "react";
import { HOME_BOUNDS, HOME_PADDING } from "../homeView";
import { getNeighborhoodMetrics } from "../data/analytics";

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
    trafficMode: TrafficMode;
    onTrafficModeChange: (mode: TrafficMode) => void;
    metricMode: MetricMode;
    onMetricModeChange: (mode: MetricMode) => void;
    onClearSelection: () => void;
    filterMin: number;
    onFilterMinChange: (val: number) => void;
    filterMax: number;
    onFilterMaxChange: (val: number) => void;
    selectedTiers: Set<number>;
    onTiersChange: (tiers: Set<number>) => void;
    distanceMin: number;
    onDistanceMinChange: (val: number) => void;
    distanceMax: number;
    onDistanceMaxChange: (val: number) => void;
    distanceRangeMiles: { min: number; max: number };
    selectedReasons: Set<string>;
    onReasonsChange: (reasons: Set<string>) => void;
    highlightedRouteIds: Set<number> | null;
    selectedNeighborhood: string | null;
    onNeighborhoodSelect: (name: string | null, routeIds?: Set<number>) => void;
}

export function MapView({
    routes,
    onRouteSelect,
    trafficMode,
    onTrafficModeChange,
    metricMode,
    onMetricModeChange,
    onClearSelection,
    filterMin,
    onFilterMinChange,
    filterMax,
    onFilterMaxChange,
    selectedTiers,
    onTiersChange,
    distanceMin,
    onDistanceMinChange,
    distanceMax,
    onDistanceMaxChange,
    distanceRangeMiles,
    selectedReasons,
    onReasonsChange,
    highlightedRouteIds,
    selectedNeighborhood,
    onNeighborhoodSelect,
}: MapViewProps) {
    const [activeRouteId, setActiveRouteId] = useState<number | null>(null);
    const homeRef = useRef<HomeState | null>(null);

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
                filterMin={filterMin}
                onFilterMinChange={onFilterMinChange}
                filterMax={filterMax}
                onFilterMaxChange={onFilterMaxChange}
                selectedTiers={selectedTiers}
                onTiersChange={onTiersChange}
                distanceMin={distanceMin}
                onDistanceMinChange={onDistanceMinChange}
                distanceMax={distanceMax}
                onDistanceMaxChange={onDistanceMaxChange}
                distanceRangeMiles={distanceRangeMiles}
                selectedReasons={selectedReasons}
                onReasonsChange={onReasonsChange}
                routes={routes}
            />
        </div>
    );
}

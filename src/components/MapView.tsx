import {
    MapContainer,
    TileLayer,
    ZoomControl,
    useMap,
    useMapEvents,
} from "react-leaflet";
import L from "leaflet";
import { RoutePolyline } from "./RoutePolyline";
import { DestinationLabels } from "./DestinationLabels";
import { Legend } from "./Legend";
import { AppHeader } from "./AppHeader";
import { METRIC_MODE } from "../types";
import type { MetricMode, TrafficMode } from "../types";
import type { Route } from "../types";
import { useState, useEffect, useRef, useMemo } from "react";
import { HOME_BOUNDS, HOME_PADDING } from "../homeView";
import { getNeighborhoodMetrics } from "../data/analytics";
import { getRouteMetricValue } from "../utils/routeColor";

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
    hiddenTiers: Set<number>;
    onHiddenTiersChange: (tiers: Set<number>) => void;
    commuterThresholds: { p33: number; p67: number };
    distanceMin: number;
    onDistanceMinChange: (val: number) => void;
    distanceMax: number;
    onDistanceMaxChange: (val: number) => void;
    distanceRangeMiles: { min: number; max: number };
    selectedReasons: Set<string>;
    onReasonsChange: (reasons: Set<string>) => void;
    hiddenDelayReasons: Set<string>;
    onHiddenDelayReasonsChange: (reasons: Set<string>) => void;
    selectedRouteName: string | null;
    highlightedRouteIds: Set<number> | null;
    selectedNeighborhood: string | null;
    onNeighborhoodSelect: (name: string | null, routeIds?: Set<number>) => void;
    dataSource: {
        label: string;
        generatedAt: string | null;
        error: string | null;
    } | null;
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
    hiddenTiers,
    onHiddenTiersChange,
    commuterThresholds,
    distanceMin,
    onDistanceMinChange,
    distanceMax,
    onDistanceMaxChange,
    distanceRangeMiles,
    selectedReasons,
    onReasonsChange,
    hiddenDelayReasons,
    onHiddenDelayReasonsChange,
    selectedRouteName,
    highlightedRouteIds,
    selectedNeighborhood,
    onNeighborhoodSelect,
    dataSource,
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
                zoomControl={false}
            >
                <FitBounds homeRef={homeRef} />
                <HomeButton homeRef={homeRef} />
                <ZoomControl position="bottomright" />
                <MapClickClear onClear={onClearSelection} />
                <TileLayer
                    attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/">CARTO</a>'
                    url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
                />
                {[...routes]
                    .sort((a, b) => {
                        const aDimmed =
                            highlightedRouteIds !== null &&
                            !highlightedRouteIds.has(a.id);
                        const bDimmed =
                            highlightedRouteIds !== null &&
                            !highlightedRouteIds.has(b.id);
                        if (aDimmed !== bDimmed)
                            return Number(aDimmed) - Number(bDimmed);
                        // Among visible routes, draw extremes last so they render on top
                        const breakeven =
                            metricMode === METRIC_MODE.PERSON_MINUTES_LOST
                                ? 0
                                : 1.0;
                        const aVal = getRouteMetricValue(
                            a,
                            trafficMode,
                            metricMode,
                        );
                        const bVal = getRouteMetricValue(
                            b,
                            trafficMode,
                            metricMode,
                        );
                        return (
                            Math.abs(aVal - breakeven) -
                            Math.abs(bVal - breakeven)
                        );
                    })
                    .map((route) => (
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
                    metricMode={metricMode}
                    selectedNeighborhood={selectedNeighborhood}
                    onNeighborhoodSelect={onNeighborhoodSelect}
                />
            </MapContainer>
            <AppHeader />
            <Legend
                trafficMode={trafficMode}
                onTrafficModeChange={onTrafficModeChange}
                metricMode={metricMode}
                onMetricModeChange={onMetricModeChange}
                filterMin={filterMin}
                onFilterMinChange={onFilterMinChange}
                filterMax={filterMax}
                onFilterMaxChange={onFilterMaxChange}
                hiddenTiers={hiddenTiers}
                onHiddenTiersChange={onHiddenTiersChange}
                commuterThresholds={commuterThresholds}
                distanceMin={distanceMin}
                onDistanceMinChange={onDistanceMinChange}
                distanceMax={distanceMax}
                onDistanceMaxChange={onDistanceMaxChange}
                distanceRangeMiles={distanceRangeMiles}
                selectedReasons={selectedReasons}
                onReasonsChange={onReasonsChange}
                hiddenDelayReasons={hiddenDelayReasons}
                onHiddenDelayReasonsChange={onHiddenDelayReasonsChange}
                selectedRouteName={selectedRouteName}
                onClearSelection={onClearSelection}
                routes={routes}
                dataSource={dataSource}
            />
        </div>
    );
}

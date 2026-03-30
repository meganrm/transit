import { useEffect, useMemo, useState } from "react";
import { MapView } from "./components/MapView";
import { RoutePanel } from "./components/RoutePanel";
import { NeighborhoodPanel } from "./components/NeighborhoodPanel";
import { FilteredRoutesPanel } from "./components/FilteredRoutesPanel";
import { routes as fallbackRoutes } from "./data/routes";
import { loadRouteData } from "./data/routeLoader";
import {
    setRouteColorRoutes,
    positionToMetric,
    getRouteMetricValue,
    getRouteSliderPosition,
} from "./utils/routeColor";
import {
    getNeighborhoodDetail,
    getNeighborhoodMetrics,
} from "./data/analytics";
import { METRIC_MODE, TRAFFIC_MODE } from "./types";
import type { MetricMode, TrafficMode } from "./types";
import type { Route } from "./types";
import { ui, transitReasonThresholds } from "./constants";
import { getCommuterRange } from "./utils/routeColor";

function computeWorst20FilterMin(
    routes: Route[],
    trafficMode: TrafficMode,
    metricMode: MetricMode,
): number {
    const nonSupplemental = routes.filter((r) => !r.supplemental);
    if (nonSupplemental.length <= 20) return 0;
    const sorted = [...nonSupplemental].sort(
        (a, b) =>
            getRouteMetricValue(b, trafficMode, metricMode) -
            getRouteMetricValue(a, trafficMode, metricMode),
    );
    return Math.floor(
        getRouteSliderPosition(sorted[19], trafficMode, metricMode),
    );
}

function getCommuterTier(
    commuters: number,
    cMin: number,
    cMax: number,
): number {
    const third = (cMax - cMin) / 3;
    if (commuters < cMin + third) return 0;
    if (commuters < cMin + 2 * third) return 1;
    return 2;
}

function routeDistanceKm(route: Route): number {
    const coords = route.coordinates as [number, number][];
    const [lat1, lng1] = coords[0];
    const [lat2, lng2] = coords[coords.length - 1];
    const R = 6371;
    const dLat = ((lat2 - lat1) * Math.PI) / 180;
    const dLng = ((lng2 - lng1) * Math.PI) / 180;
    const a =
        Math.sin(dLat / 2) ** 2 +
        Math.cos((lat1 * Math.PI) / 180) *
            Math.cos((lat2 * Math.PI) / 180) *
            Math.sin(dLng / 2) ** 2;
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function kmToMiles(km: number): number {
    return km * 0.621371;
}

function routeMatchesReason(route: Route, reason: string): boolean {
    const { longWaitMinutes, longWalkMinutes } = transitReasonThresholds;
    switch (reason) {
        case "transfer":
            return route.transitTransfers >= 1;
        case "longWait":
            return route.transitMaxWaitMinutes >= longWaitMinutes;
        case "walking":
            return route.transitWalkMinutes >= longWalkMinutes;
        default:
            return false;
    }
}

const DATA_URL = import.meta.env.VITE_ROUTES_DATA_URL as string | undefined;

interface RouteDataState {
    routes: Route[];
    sourceLabel: string;
    generatedAt: string | null;
    loadError: string | null;
}

function App() {
    const [routeData, setRouteData] = useState<RouteDataState>({
        routes: fallbackRoutes,
        sourceLabel: "Bundled demo data",
        generatedAt: null,
        loadError: null,
    });
    const [selectedRouteId, setSelectedRouteId] = useState<number | null>(null);
    const [selectedNeighborhood, setSelectedNeighborhood] = useState<
        string | null
    >(null);
    const [selectedNeighborhoodRouteIds, setSelectedNeighborhoodRouteIds] =
        useState<Set<number> | null>(null);
    const [trafficMode, setTrafficMode] = useState<TrafficMode>(
        TRAFFIC_MODE.PEAK_TRAFFIC,
    );
    const [metricMode, setMetricMode] = useState<MetricMode>(
        METRIC_MODE.TRAVEL_TIME_DIFFERENCE,
    );
    const [filterMin, setFilterMin] = useState(() =>
        computeWorst20FilterMin(
            fallbackRoutes,
            TRAFFIC_MODE.PEAK_TRAFFIC,
            METRIC_MODE.TRAVEL_TIME_DIFFERENCE,
        ),
    );
    const [filterMax, setFilterMax] = useState(100);
    const [selectedTiers, setSelectedTiers] = useState<Set<number>>(new Set());
    const [distanceMin, setDistanceMin] = useState(0);
    const [distanceMax, setDistanceMax] = useState(100);
    const [selectedReasons, setSelectedReasons] = useState<Set<string>>(
        new Set(),
    );

    useEffect(() => {
        let cancelled = false;

        async function bootstrapRouteData() {
            if (!DATA_URL) return;
            try {
                const result = await loadRouteData(DATA_URL);
                if (cancelled) return;
                // Rebuild color scales before computing the filter position
                // so getRouteSliderPosition uses the new routes' ranges.
                setRouteColorRoutes(result.routes);
                setRouteData({
                    routes: result.routes,
                    sourceLabel: result.sourceLabel,
                    generatedAt: result.generatedAt,
                    loadError: null,
                });
                setFilterMin(
                    computeWorst20FilterMin(
                        result.routes,
                        trafficMode,
                        metricMode,
                    ),
                );
                setFilterMax(100);
            } catch (error) {
                if (cancelled) return;
                setRouteData((prev) => ({
                    ...prev,
                    loadError:
                        error instanceof Error
                            ? error.message
                            : "Unable to load route data",
                }));
            }
        }

        bootstrapRouteData();
        return () => {
            cancelled = true;
        };
    }, []);

    useEffect(() => {
        if (selectedRouteId === null) return;
        if (!routeData.routes.some((route) => route.id === selectedRouteId)) {
            setSelectedRouteId(null);
        }
    }, [selectedRouteId, routeData.routes]);

    useEffect(() => {
        setFilterMin(
            computeWorst20FilterMin(routeData.routes, trafficMode, metricMode),
        );
        setFilterMax(100);
        setSelectedTiers(new Set());
        setDistanceMin(0);
        setDistanceMax(100);
        setSelectedReasons(new Set());
    }, [trafficMode, metricMode]); // eslint-disable-line react-hooks/exhaustive-deps

    useMemo(() => {
        setRouteColorRoutes(routeData.routes);
    }, [routeData.routes]);

    const distanceRangeMiles = useMemo(() => {
        const miles = routeData.routes.map((r) => kmToMiles(routeDistanceKm(r)));
        return {
            min: miles.length > 0 ? Math.floor(Math.min(...miles)) : 0,
            max: miles.length > 0 ? Math.ceil(Math.max(...miles)) : 30,
        };
    }, [routeData.routes]);

    const highlightedRouteIds = useMemo<Set<number> | null>(() => {
        if (selectedRouteId !== null) return new Set([selectedRouteId]);
        if (selectedNeighborhoodRouteIds !== null)
            return selectedNeighborhoodRouteIds;

        const colorActive = filterMin !== 0 || filterMax !== 100;
        const tierActive = selectedTiers.size > 0;
        const distanceActive = distanceMin > 0 || distanceMax < 100;
        const reasonActive = selectedReasons.size > 0;

        if (!colorActive && !tierActive && !distanceActive && !reasonActive)
            return null;

        const { min: cMin, max: cMax } = getCommuterRange();
        const minMetric = positionToMetric(filterMin, trafficMode, metricMode);
        const maxMetric = positionToMetric(filterMax, trafficMode, metricMode);

        const ids = new Set<number>();
        for (const route of routeData.routes) {
            if (colorActive) {
                const v = getRouteMetricValue(route, trafficMode, metricMode);
                if (v < minMetric || v > maxMetric) continue;
            }
            if (
                tierActive &&
                !selectedTiers.has(
                    getCommuterTier(route.dailyCommuters, cMin, cMax),
                )
            )
                continue;
            if (distanceActive) {
                const d = kmToMiles(routeDistanceKm(route));
                const dMinMiles =
                    distanceRangeMiles.min +
                    (distanceMin / 100) *
                        (distanceRangeMiles.max - distanceRangeMiles.min);
                const dMaxMiles =
                    distanceRangeMiles.min +
                    (distanceMax / 100) *
                        (distanceRangeMiles.max - distanceRangeMiles.min);
                if (d < dMinMiles || d > dMaxMiles) continue;
            }
            if (
                reasonActive &&
                !Array.from(selectedReasons).some((r) =>
                    routeMatchesReason(route, r),
                )
            )
                continue;
            ids.add(route.id);
        }
        return ids.size > 0 ? ids : null;
    }, [
        selectedRouteId,
        selectedNeighborhoodRouteIds,
        filterMin,
        filterMax,
        selectedTiers,
        distanceMin,
        distanceMax,
        distanceRangeMiles,
        selectedReasons,
        trafficMode,
        metricMode,
        routeData.routes,
    ]);

    const selectedRoute =
        routeData.routes.find((r) => r.id === selectedRouteId) ?? null;

    const highlightedRoutes = useMemo(() => {
        const pool =
            highlightedRouteIds === null
                ? routeData.routes
                : routeData.routes.filter((r) => highlightedRouteIds.has(r.id));
        return pool
            .filter((r) => !r.supplemental)
            .sort(
                (a, b) =>
                    getRouteMetricValue(b, trafficMode, metricMode) -
                    getRouteMetricValue(a, trafficMode, metricMode),
            );
    }, [highlightedRouteIds, routeData.routes, trafficMode, metricMode]);
    const maxAvgRatio = useMemo(() => {
        const metrics = getNeighborhoodMetrics(routeData.routes, trafficMode);
        return metrics[0]?.avgRatio ?? 2;
    }, [routeData.routes, trafficMode]);
    const neighborhoodDetail =
        selectedNeighborhood && selectedNeighborhoodRouteIds
            ? getNeighborhoodDetail(
                  routeData.routes,
                  selectedNeighborhood,
                  selectedNeighborhoodRouteIds,
                  trafficMode,
              )
            : null;

    const handleRouteSelect = (id: number) => {
        setSelectedNeighborhood(null);
        setSelectedNeighborhoodRouteIds(null);
        setSelectedRouteId(id);
    };

    const handleNeighborhoodSelect = (
        name: string | null,
        routeIds?: Set<number>,
    ) => {
        setSelectedRouteId(null);
        setSelectedNeighborhood(name);
        setSelectedNeighborhoodRouteIds(routeIds ?? null);
    };

    const handleClearSelection = () => {
        setSelectedRouteId(null);
        setSelectedNeighborhood(null);
        setSelectedNeighborhoodRouteIds(null);
    };

    return (
        <div style={{ display: "flex", height: "100vh", width: "100vw" }}>
            <div style={{ flex: 1, minWidth: 0 }}>
                {(routeData.loadError || DATA_URL) && (
                    <div
                        style={{
                            position: "absolute",
                            textAlign: "right",
                            bottom: 16,
                            right: 12,
                            zIndex: 1200,
                            fontSize: 8,
                            color: routeData.loadError
                                ? ui.dataSourceBadge.errorText
                                : ui.dataSourceBadge.infoText,
                            background: ui.dataSourceBadge.background,
                            border: ui.dataSourceBadge.border,
                            borderRadius: 6,
                            padding: "6px 8px",
                            maxWidth: 360,
                            lineHeight: 1.4,
                        }}
                    >
                        <div>Data source: {routeData.sourceLabel}</div>
                        {routeData.generatedAt && (
                            <div>
                                Generated:{" "}
                                {new Date(
                                    routeData.generatedAt,
                                ).toLocaleString()}
                            </div>
                        )}
                        {routeData.loadError && (
                            <div>
                                Using fallback data ({routeData.loadError})
                            </div>
                        )}
                    </div>
                )}
                <MapView
                    routes={routeData.routes}
                    onRouteSelect={handleRouteSelect}
                    onClearSelection={handleClearSelection}
                    trafficMode={trafficMode}
                    onTrafficModeChange={setTrafficMode}
                    metricMode={metricMode}
                    onMetricModeChange={setMetricMode}
                    filterMin={filterMin}
                    onFilterMinChange={setFilterMin}
                    filterMax={filterMax}
                    onFilterMaxChange={setFilterMax}
                    selectedTiers={selectedTiers}
                    onTiersChange={setSelectedTiers}
                    distanceMin={distanceMin}
                    onDistanceMinChange={setDistanceMin}
                    distanceMax={distanceMax}
                    onDistanceMaxChange={setDistanceMax}
                    distanceRangeMiles={distanceRangeMiles}
                    selectedReasons={selectedReasons}
                    onReasonsChange={setSelectedReasons}
                    highlightedRouteIds={highlightedRouteIds}
                    selectedNeighborhood={selectedNeighborhood}
                    onNeighborhoodSelect={handleNeighborhoodSelect}
                />
            </div>

            {selectedRoute && (
                <RoutePanel
                    route={selectedRoute}
                    onClose={() => setSelectedRouteId(null)}
                    trafficMode={trafficMode}
                    metricMode={metricMode}
                />
            )}
            {neighborhoodDetail && (
                <NeighborhoodPanel
                    detail={neighborhoodDetail}
                    trafficMode={trafficMode}
                    maxAvgRatio={maxAvgRatio}
                    onClose={() => handleNeighborhoodSelect(null)}
                    onRouteSelect={handleRouteSelect}
                />
            )}
            {!selectedRoute && !neighborhoodDetail && (
                <FilteredRoutesPanel
                    routes={highlightedRoutes}
                    trafficMode={trafficMode}
                    metricMode={metricMode}
                    isFullRange={filterMin === 0 && filterMax === 100}
                    onRouteSelect={handleRouteSelect}
                />
            )}
        </div>
    );
}

export default App;

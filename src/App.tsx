import { useEffect, useMemo, useState } from "react";
import { MapView } from "./components/MapView";
import { RoutePanel } from "./components/RoutePanel";
import { NeighborhoodPanel } from "./components/NeighborhoodPanel";
import { routes as fallbackRoutes } from "./data/routes";
import { loadRouteData } from "./data/routeLoader";
import { setRouteColorRoutes } from "./utils/routeColor";
import {
    getNeighborhoodDetail,
    getNeighborhoodMetrics,
} from "./data/analytics";
import type { ViewMode } from "./components/ViewToggle";
import type { MetricMode, TrafficMode } from "./types";
import type { Route } from "./types";

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
    const [viewMode, setViewMode] = useState<ViewMode>("all");
    const [trafficMode, setTrafficMode] = useState<TrafficMode>("peak-traffic");
    const [metricMode, setMetricMode] = useState<MetricMode>(
        "travel-time-difference",
    );
    const [worstCount, setWorstCount] = useState(0);
    const [bestCount, setBestCount] = useState(0);

    useEffect(() => {
        let cancelled = false;

        async function bootstrapRouteData() {
            if (!DATA_URL) return;
            try {
                const result = await loadRouteData(DATA_URL);
                if (cancelled) return;
                setRouteData({
                    routes: result.routes,
                    sourceLabel: result.sourceLabel,
                    generatedAt: result.generatedAt,
                    loadError: null,
                });
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

    useMemo(() => {
        setRouteColorRoutes(routeData.routes);
    }, [routeData.routes]);

    const selectedRoute =
        routeData.routes.find((r) => r.id === selectedRouteId) ?? null;
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

    const handleViewModeChange = (mode: ViewMode) => {
        setViewMode(mode);
        setSelectedRouteId(null);
        setSelectedNeighborhood(null);
        setSelectedNeighborhoodRouteIds(null);
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
                            color: routeData.loadError ? "#fecaca" : "#cbd5e1",
                            background: "rgba(2, 6, 23, 0.8)",
                            border: "1px solid rgba(148, 163, 184, 0.25)",
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
                    viewMode={viewMode}
                    onViewModeChange={handleViewModeChange}
                    onClearSelection={handleClearSelection}
                    trafficMode={trafficMode}
                    onTrafficModeChange={setTrafficMode}
                    metricMode={metricMode}
                    onMetricModeChange={setMetricMode}
                    routeCount={routeData.routes.length}
                    worstCount={worstCount}
                    onWorstCountChange={setWorstCount}
                    bestCount={bestCount}
                    onBestCountChange={setBestCount}
                    selectedNeighborhood={selectedNeighborhood}
                    selectedNeighborhoodRouteIds={selectedNeighborhoodRouteIds}
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
        </div>
    );
}

export default App;

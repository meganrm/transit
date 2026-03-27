import { useState } from "react";
import { MapView } from "./components/MapView";
import { RoutePanel } from "./components/RoutePanel";
import { NeighborhoodPanel } from "./components/NeighborhoodPanel";
import { routes } from "./data/routes";
import { getNeighborhoodDetail } from "./data/analytics";
import type { ViewMode } from "./components/ViewToggle";
import type { MetricMode, TrafficMode } from "./types";

function App() {
    const [selectedRouteId, setSelectedRouteId] = useState<number | null>(null);
    const [selectedNeighborhood, setSelectedNeighborhood] = useState<
        string | null
    >(null);
    const [selectedNeighborhoodRouteIds, setSelectedNeighborhoodRouteIds] =
        useState<Set<number> | null>(null);
    const [viewMode, setViewMode] = useState<ViewMode>("all");
    const [trafficMode, setTrafficMode] = useState<TrafficMode>("peak-traffic");
    const [metricMode, setMetricMode] =
        useState<MetricMode>("travel-time-difference");
    const [focusLevel, setFocusLevel] = useState(0);

    const selectedRoute = routes.find((r) => r.id === selectedRouteId) ?? null;
    const neighborhoodDetail =
        selectedNeighborhood && selectedNeighborhoodRouteIds
            ? getNeighborhoodDetail(
                  routes,
                  selectedNeighborhood,
                  selectedNeighborhoodRouteIds,
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
                <MapView
                    onRouteSelect={handleRouteSelect}
                    viewMode={viewMode}
                    onViewModeChange={handleViewModeChange}
                    onClearSelection={handleClearSelection}
                    trafficMode={trafficMode}
                    onTrafficModeChange={setTrafficMode}
                    metricMode={metricMode}
                    onMetricModeChange={setMetricMode}
                    focusLevel={focusLevel}
                    onFocusLevelChange={setFocusLevel}
                    selectedNeighborhood={selectedNeighborhood}
                    selectedNeighborhoodRouteIds={selectedNeighborhoodRouteIds}
                    onNeighborhoodSelect={handleNeighborhoodSelect}
                />
            </div>

            {selectedRoute && (
                <RoutePanel
                    route={selectedRoute}
                    onClose={() => setSelectedRouteId(null)}
                />
            )}
            {neighborhoodDetail && (
                <NeighborhoodPanel
                    detail={neighborhoodDetail}
                    onClose={() => handleNeighborhoodSelect(null)}
                    onRouteSelect={handleRouteSelect}
                />
            )}
        </div>
    );
}

export default App;

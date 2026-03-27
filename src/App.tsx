import { useState } from "react";
import { MapView } from "./components/MapView";
import { RoutePanel } from "./components/RoutePanel";
import { routes } from "./data/routes";
import type { ViewMode } from "./components/ViewToggle";

function App() {
    const [selectedRouteId, setSelectedRouteId] = useState<number | null>(null);
    const [viewMode, setViewMode] = useState<ViewMode>("all");
    const selectedRoute = routes.find((r) => r.id === selectedRouteId) ?? null;

    return (
        <div style={{ display: "flex", height: "100vh", width: "100vw" }}>
            <div style={{ flex: 1, minWidth: 0 }}>
                <MapView
                    onRouteSelect={setSelectedRouteId}
                    viewMode={viewMode}
                    onViewModeChange={setViewMode}
                />
            </div>
            {selectedRoute && (
                <RoutePanel
                    route={selectedRoute}
                    onClose={() => setSelectedRouteId(null)}
                />
            )}
        </div>
    );
}

export default App;

import { MapContainer, TileLayer, useMap } from "react-leaflet";
import L from "leaflet";
import { routes } from "../data/routes";
import { RoutePolyline } from "./RoutePolyline";
import { DestinationLabels } from "./DestinationLabels";
import { Legend } from "./Legend";
import { useState, useEffect, useRef } from "react";
import { HOME_CENTER, HOME_BOUNDS, HOME_PADDING } from "../homeView";

const homeBounds = L.latLngBounds(HOME_BOUNDS[0], HOME_BOUNDS[1]);

/**
 * On first mount, fit to bounds + zoom in one level.
 * Stores the resulting zoom in the ref so HomeButton can reuse it.
 */
function FitBounds({
    zoomRef,
}: {
    zoomRef: React.MutableRefObject<number | null>;
}) {
    const map = useMap();
    const fitted = useRef(false);
    useEffect(() => {
        if (fitted.current) return;
        fitted.current = true;
        // fitBounds picks the right zoom for the current viewport
        map.fitBounds(homeBounds, {
            padding: [HOME_PADDING, HOME_PADDING],
            animate: false,
        });
        // Zoom in one extra level and cache it
        const zoom = map.getZoom() + 1;
        zoomRef.current = zoom;
        map.setView(HOME_CENTER, zoom, { animate: false });
    }, [map, zoomRef]);
    return null;
}

function HomeButton({
    zoomRef,
}: {
    zoomRef: React.MutableRefObject<number | null>;
}) {
    const map = useMap();
    return (
        <button
            className="home-button"
            title="Reset view"
            onClick={() => {
                // Always snap — never animate — to prevent drift
                map.stop();
                map.setView(HOME_CENTER, zoomRef.current ?? 13, {
                    animate: false,
                });
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

export function MapView() {
    const [activeRouteId, setActiveRouteId] = useState<number | null>(null);
    const zoomRef = useRef<number | null>(null);

    return (
        <div style={{ height: "100%", width: "100%", position: "relative" }}>
            <MapContainer
                center={HOME_CENTER}
                zoom={13}
                style={{ height: "100%", width: "100%" }}
                zoomControl={true}
            >
                <FitBounds zoomRef={zoomRef} />
                <HomeButton zoomRef={zoomRef} />
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
                            activeRouteId !== null && activeRouteId !== route.id
                        }
                        onHover={setActiveRouteId}
                    />
                ))}
                <DestinationLabels activeRouteId={activeRouteId} />
            </MapContainer>
            <Legend />
        </div>
    );
}

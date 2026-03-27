import { MapContainer, TileLayer, useMap } from "react-leaflet";
import L from "leaflet";
import { routes } from "../data/routes";
import { destinations } from "../data/destinations";
import { RoutePolyline } from "./RoutePolyline";
import { DestinationLabels } from "./DestinationLabels";
import { Legend } from "./Legend";
import { useState, useMemo, useEffect } from "react";

const PADDING = 10; // padding in pixels when fitting bounds

function getDestinationBounds() {
    const points = destinations.map((d) => d.position as [number, number]);
    // Find the northernmost and southernmost destinations
    let north = points[0];
    let south = points[0];
    for (const p of points) {
        if (p[0] > north[0]) north = p;
        if (p[0] < south[0]) south = p;
    }
    // Bounds span only those two points — maximizes zoom while keeping both visible
    return L.latLngBounds([south[0], south[1]], [north[0], north[1]]);
}

function FitBounds({ bounds }: { bounds: L.LatLngBounds }) {
    const map = useMap();
    useEffect(() => {
        map.fitBounds(bounds, { padding: [PADDING, PADDING] });
    }, [map, bounds]);
    return null;
}

function HomeButton({ bounds }: { bounds: L.LatLngBounds }) {
    const map = useMap();
    return (
        <button
            className="home-button"
            title="Reset view"
            onClick={() =>
                map.fitBounds(bounds, { padding: [PADDING, PADDING] })
            }
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
    const bounds = useMemo(getDestinationBounds, []);

    return (
        <div style={{ height: "100%", width: "100%", position: "relative" }}>
            <MapContainer
                center={[47.6062, -122.3321]}
                zoom={11}
                style={{ height: "100%", width: "100%" }}
                zoomControl={true}
            >
                <FitBounds bounds={bounds} />
                <HomeButton bounds={bounds} />
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

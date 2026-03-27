import { MapContainer, TileLayer } from "react-leaflet";
import { routes } from "../data/routes";
import { RoutePolyline } from "./RoutePolyline";
import { DestinationLabels } from "./DestinationLabels";
import { Legend } from "./Legend";
import { useState } from "react";

export function MapView() {
    const [activeRouteId, setActiveRouteId] = useState<number | null>(null);

    return (
        <div style={{ flex: 1, position: "relative" }}>
            <MapContainer
                center={[47.6062, -122.3321]}
                zoom={11}
                style={{ height: "100%", width: "100%" }}
                zoomControl={true}
            >
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

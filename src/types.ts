import type { LatLngExpression } from "leaflet";

export interface Route {
    id: number;
    name: string;
    description: string;
    coordinates: LatLngExpression[];
    carMinutes: number;
    carMinutesPeak: number;
    transitMinutes: number;
    transitModes: string[];
    dailyCommuters: number;
    peakHours: string;
}

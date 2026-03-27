import type { LatLngExpression } from "leaflet";

export type ColorMode = "no-traffic" | "peak-traffic" | "person-minutes";

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

import type { LatLngExpression } from "leaflet";

export type TrafficMode = "no-traffic" | "peak-traffic";

export type MetricMode = "travel-time-difference" | "person-minutes-lost";

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
    supplemental?: boolean;
}

import type { LatLngExpression } from "leaflet";

export const TRAFFIC_MODE = {
    NO_TRAFFIC: "no-traffic",
    PEAK_TRAFFIC: "peak-traffic",
} as const;

export type TrafficMode = (typeof TRAFFIC_MODE)[keyof typeof TRAFFIC_MODE];

export const METRIC_MODE = {
    TRAVEL_TIME_DIFFERENCE: "travel-time-difference",
    PERSON_MINUTES_LOST: "person-minutes-lost",
} as const;

export type MetricMode = (typeof METRIC_MODE)[keyof typeof METRIC_MODE];

export interface Route {
    id: number;
    name: string;
    description: string;
    coordinates: LatLngExpression[];
    carMinutes: number;
    carMinutesPeak: number;
    transitMinutes: number;
    transitModes: string[];
    transitWalkMinutes: number;
    transitTransfers: number;
    transitMaxWaitMinutes: number;
    dailyCommuters: number;
    peakHours: string;
    supplemental?: boolean;
}

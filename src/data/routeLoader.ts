import type { LatLngExpression } from "leaflet";
import type { Route } from "../types";

export interface RouteDataResult {
    routes: Route[];
    sourceLabel: string;
    generatedAt: string | null;
}

interface RouteDataPayload {
    routes?: unknown;
    sourceLabel?: unknown;
    generatedAt?: unknown;
}

function isLatLngPair(value: unknown): value is [number, number] {
    if (!Array.isArray(value) || value.length !== 2) return false;
    const [lat, lng] = value;
    return (
        typeof lat === "number" &&
        Number.isFinite(lat) &&
        typeof lng === "number" &&
        Number.isFinite(lng)
    );
}

function parseCoordinates(value: unknown): LatLngExpression[] | null {
    if (!Array.isArray(value)) return null;
    const pairs = value.filter(isLatLngPair);
    if (pairs.length !== value.length || pairs.length < 2) return null;
    return pairs;
}

function parseRoute(value: unknown): Route | null {
    if (typeof value !== "object" || value === null) return null;
    const candidate = value as Record<string, unknown>;

    if (
        typeof candidate.id !== "number" ||
        typeof candidate.name !== "string" ||
        typeof candidate.description !== "string" ||
        typeof candidate.carMinutes !== "number" ||
        typeof candidate.carMinutesPeak !== "number" ||
        typeof candidate.transitMinutes !== "number" ||
        !Array.isArray(candidate.transitModes) ||
        candidate.transitModes.some((m) => typeof m !== "string") ||
        typeof candidate.dailyCommuters !== "number" ||
        typeof candidate.peakHours !== "string"
    ) {
        return null;
    }

    const coordinates = parseCoordinates(candidate.coordinates);
    if (!coordinates) return null;

    return {
        id: candidate.id,
        name: candidate.name,
        description: candidate.description,
        coordinates,
        carMinutes: candidate.carMinutes,
        carMinutesPeak: candidate.carMinutesPeak,
        transitMinutes: candidate.transitMinutes,
        transitModes: candidate.transitModes as string[],
        dailyCommuters: candidate.dailyCommuters,
        peakHours: candidate.peakHours,
    };
}

function normalizePayload(json: unknown): RouteDataPayload {
    if (Array.isArray(json)) {
        return { routes: json };
    }
    if (typeof json === "object" && json !== null) {
        return json as RouteDataPayload;
    }
    return {};
}

export async function loadRouteData(url: string): Promise<RouteDataResult> {
    const response = await fetch(url, {
        headers: { Accept: "application/json" },
    });
    if (!response.ok) {
        throw new Error(`Route data request failed (${response.status})`);
    }

    const payload = normalizePayload(await response.json());
    if (!Array.isArray(payload.routes)) {
        throw new Error("Route data is missing a routes array");
    }

    const parsed = payload.routes.map(parseRoute).filter(Boolean) as Route[];
    if (parsed.length !== payload.routes.length || parsed.length === 0) {
        throw new Error("Route data contains invalid route records");
    }

    parsed.sort((a, b) => a.id - b.id);

    return {
        routes: parsed,
        sourceLabel:
            typeof payload.sourceLabel === "string"
                ? payload.sourceLabel
                : "Remote route feed",
        generatedAt:
            typeof payload.generatedAt === "string"
                ? payload.generatedAt
                : null,
    };
}

import { destinations } from "./data/destinations";

/**
 * Pre-computed home view center and bounds from destination coordinates.
 * Pure math — no Leaflet map instance dependency — so the result is
 * deterministic and identical on every call / every render.
 */

const points = destinations.map((d) => d.position as [number, number]);
const lats = points.map((p) => p[0]);
const lngs = points.map((p) => p[1]);

export const HOME_CENTER: [number, number] = [
    (Math.min(...lats) + Math.max(...lats)) / 2,
    (Math.min(...lngs) + Math.max(...lngs)) / 2,
];

export const HOME_BOUNDS: [[number, number], [number, number]] = [
    [Math.min(...lats), Math.min(...lngs)],
    [Math.max(...lats), Math.max(...lngs)],
];

/** Padding in pixels applied to all sides when fitting bounds */
export const HOME_PADDING = 10;

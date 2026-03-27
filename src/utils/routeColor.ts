import { routes } from "../data/routes";
import { getDataRatioRange } from "../data/analytics";

// Semantic interior stops — define the palette shape.
// Endpoints are set dynamically from actual data min/max.
const INNER_STOPS: [number, number, number, number][] = [
    [0.85, 161, 215, 106], // medium green
    [1.0, 230, 245, 208], // pale green — equal
    [1.1, 253, 224, 239], // pale pink
    [1.8, 233, 163, 201], // medium pink
];

const { min: DATA_MIN, max: DATA_MAX } = getDataRatioRange(routes);

// Filter out inner stops that fall outside the actual data range,
// then prepend/append the data-anchored endpoints.
const innerInRange = INNER_STOPS.filter(
    ([ratio]) => ratio > DATA_MIN && ratio < DATA_MAX,
);

export const COLOR_STOPS: [number, number, number, number][] = [
    [DATA_MIN, 77, 146, 33], // deep green — best route in data
    ...innerInRange,
    [DATA_MAX, 197, 27, 125], // deep magenta — worst route in data
];

export function getRouteRgb(route: {
    transitMinutes: number;
    carMinutesPeak: number;
}): [number, number, number] {
    const ratio = route.transitMinutes / route.carMinutesPeak;
    if (ratio <= COLOR_STOPS[0][0]) {
        return [COLOR_STOPS[0][1], COLOR_STOPS[0][2], COLOR_STOPS[0][3]];
    }
    for (let i = 0; i < COLOR_STOPS.length - 1; i++) {
        const [r0, r, g, b] = COLOR_STOPS[i];
        const [r1, r2, g2, b2] = COLOR_STOPS[i + 1];
        if (ratio <= r1) {
            const t = (ratio - r0) / (r1 - r0);
            return [
                Math.round(r + t * (r2 - r)),
                Math.round(g + t * (g2 - g)),
                Math.round(b + t * (b2 - b)),
            ];
        }
    }
    const last = COLOR_STOPS[COLOR_STOPS.length - 1];
    return [last[1], last[2], last[3]];
}

export function getRouteColor(route: {
    transitMinutes: number;
    carMinutesPeak: number;
}): string {
    const [r, g, b] = getRouteRgb(route);
    return `rgb(${r},${g},${b})`;
}

export function buildLegendGradient(): string {
    const range = DATA_MAX - DATA_MIN;
    const pct = (ratio: number) =>
        `${(((ratio - DATA_MIN) / range) * 100).toFixed(1)}%`;

    const stops: string[] = [`#4d9221 ${pct(DATA_MIN)}`];
    if (DATA_MIN < 0.85 && DATA_MAX > 0.85) stops.push(`#a1d76a ${pct(0.85)}`);
    if (DATA_MIN < 1.0 && DATA_MAX > 1.0) stops.push(`#e6f5d0 ${pct(1.0)}`);
    if (DATA_MIN < 1.1 && DATA_MAX > 1.1) stops.push(`#fde0ef ${pct(1.1)}`);
    if (DATA_MIN < 1.8 && DATA_MAX > 1.8) stops.push(`#e9a3c9 ${pct(1.8)}`);
    stops.push(`#c51b7d ${pct(DATA_MAX)}`);

    return `linear-gradient(to right, ${stops.join(", ")})`;
}

export function getLegendEqualPct(): string {
    const range = DATA_MAX - DATA_MIN;
    return `${(((1.0 - DATA_MIN) / range) * 100).toFixed(1)}%`;
}

/** Shared theme colors — used in components and mirrored as CSS custom properties in index.css */
export const theme = {
    /** Primary dark background (panels, popups, controls) */
    bgDark: "#1e293b",
    /** Slightly lighter dark (borders, hover states) */
    bgDarkHover: "#334155",
    /** Semi-transparent dark overlay */
    bgOverlay: "rgba(15, 23, 42, 0.92)",
    /** Primary text on dark backgrounds */
    textPrimary: "#e2e8f0",
    /** Bright text (headings, highlights) */
    textBright: "#f8fafc",
    /** Secondary/muted text */
    textSecondary: "#94a3b8",
    /** Dim text (non-highlighted labels) */
    textDim: "#64748b",
} as const;

/** Route color coding based on transit-to-car time ratio */
export const routeColors = {
    /** Transit faster or equal (ratio <= 1) */
    green: "#22c55e",
    /** Transit up to 50% slower (ratio <= 1.5) */
    yellow: "#eab308",
    /** Transit >50% slower (ratio > 1.5) */
    red: "#ef4444",
} as const;

/** Ratio thresholds for color coding */
export const ratioThresholds = {
    /** At or below this ratio → green */
    equal: 1,
    /** At or below this ratio → yellow; above → red */
    moderate: 1.5,
} as const;

/** Route line weight scaling */
export const weightScale = {
    minWeight: 2,
    maxWeight: 8,
    /** Extra weight added on hover */
    hoverBoost: 3,
} as const;

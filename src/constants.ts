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

/** Shared UI literal values used across inline styles/components */
export const ui = {
    routeNameSeparator: " → ",
    status: {
        danger: "#f87171",
        success: "#4ade80",
        warning: "#a5b4fc",
    },
    panel: {
        titleText: "#f1f5f9",
        borderSoft: "1px solid rgba(148, 163, 184, 0.1)",
        borderSofter: "1px solid rgba(148, 163, 184, 0.08)",
        borderRegular: "1px solid rgba(148, 163, 184, 0.15)",
    },
    chips: {
        background: "rgba(99, 102, 241, 0.2)",
        text: "#a5b4fc",
    },
    sliderFill: {
        worst: "#c51b7d",
        best: "#4ade80",
    },
    dataSourceBadge: {
        infoText: "#cbd5e1",
        errorText: "#fecaca",
        background: "rgba(2, 6, 23, 0.8)",
        border: "1px solid rgba(148, 163, 184, 0.25)",
    },
    accent: {
        positiveLabel: "#22c55e",
        negativeLabel: "#c51b7d",
    },
} as const;

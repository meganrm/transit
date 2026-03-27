import type { ColorMode } from "../types";
import { weightScale, theme } from "../constants";
import {
    buildLegendGradient,
    getLegendEqualPct,
    getLegendBreakevenPct,
    DATA_PERSON_MINUTES_MAX,
} from "../utils/routeColor";

const COLOR_MODE_OPTIONS: { value: ColorMode; label: string }[] = [
    { value: "no-traffic", label: "No traffic" },
    { value: "peak-traffic", label: "Peak traffic" },
    { value: "person-minutes", label: "Person-min" },
];

const DESCRIPTIONS: Record<ColorMode, string> = {
    "no-traffic": "Transit vs ideal, uncongested driving",
    "peak-traffic": "Transit vs rush-hour driving",
    "person-minutes":
        "Total time lost, weighted by ridership — also drives line thickness",
};

const SECTION_HEADER: React.CSSProperties = {
    fontSize: 9,
    color: theme.textDim,
    textTransform: "uppercase",
    letterSpacing: "0.08em",
    marginBottom: 6,
};

const TOTAL_ROUTES = 37;

interface Props {
    colorMode: ColorMode;
    onColorModeChange: (mode: ColorMode) => void;
    focusLevel: number;
    onFocusLevelChange: (level: number) => void;
}

export function Legend({ colorMode, onColorModeChange, focusLevel, onFocusLevelChange }: Props) {
    const gradient = buildLegendGradient(colorMode);
    const equalPct = getLegendEqualPct(colorMode);
    const breakevenPct = getLegendBreakevenPct();

    const tickPct = colorMode === "person-minutes" ? breakevenPct : equalPct;
    const tickLabel = colorMode === "person-minutes" ? "breakeven" : "equal";
    const labelLeft = colorMode === "person-minutes" ? "Saves time" : "Faster";
    const labelRight =
        colorMode === "person-minutes" ? "Loses time" : "Slower";
    const sectionTitle =
        colorMode === "no-traffic"
            ? "Transit vs No Traffic"
            : colorMode === "peak-traffic"
              ? "Transit vs Peak Traffic"
              : "Person-minutes lost";

    const pmMax = DATA_PERSON_MINUTES_MAX;
    const thicknessItems =
        colorMode === "person-minutes"
            ? [
                  { weight: weightScale.minWeight, label: "0 min lost" },
                  {
                      weight: weightScale.midWeight,
                      label: `~${Math.round(pmMax / 2 / 1000)}k min/day`,
                  },
                  {
                      weight: weightScale.maxWeight,
                      label: `~${Math.round(pmMax / 1000)}k min/day`,
                  },
              ]
            : [
                  {
                      weight: weightScale.minWeight,
                      label: `~${weightScale.minCommuters / 1000}k/day`,
                  },
                  {
                      weight: weightScale.midWeight,
                      label: `~${weightScale.midCommuters / 1000}k/day`,
                  },
                  {
                      weight: weightScale.maxWeight,
                      label: `~${weightScale.maxCommuters / 1000}k/day`,
                  },
              ];
    const thicknessTitle =
        colorMode === "person-minutes" ? "Line thickness" : "Daily commuters";

    return (
        <div
            style={{
                position: "absolute",
                bottom: 24,
                left: 12,
                background: theme.bgOverlay,
                color: theme.textPrimary,
                borderRadius: 8,
                padding: "14px 16px",
                boxShadow: "0 2px 12px rgba(0,0,0,0.4)",
                zIndex: 1000,
                width: 270,
            }}
        >
            {/* Color-by header + selector */}
            <div style={SECTION_HEADER}>Color by</div>
            <div
                style={{
                    display: "flex",
                    gap: 2,
                    marginBottom: 14,
                    background: "rgba(148,163,184,0.08)",
                    borderRadius: 6,
                    padding: 3,
                }}
            >
                {COLOR_MODE_OPTIONS.map(({ value, label }) => (
                    <button
                        key={value}
                        onClick={() => onColorModeChange(value)}
                        style={{
                            flex: 1,
                            fontSize: 11,
                            padding: "4px 0",
                            border: "none",
                            borderRadius: 5,
                            cursor: "pointer",
                            background:
                                colorMode === value
                                    ? "rgba(165, 180, 252, 0.2)"
                                    : "none",
                            color:
                                colorMode === value
                                    ? "#a5b4fc"
                                    : theme.textSecondary,
                            fontWeight: colorMode === value ? 600 : 400,
                            transition: "all 0.15s",
                            whiteSpace: "nowrap",
                        }}
                    >
                        {label}
                    </button>
                ))}
            </div>

            {/* Gradient section */}
            <div
                style={{
                    fontSize: 12,
                    fontWeight: 600,
                    color: theme.textPrimary,
                    marginBottom: 3,
                }}
            >
                {sectionTitle}
            </div>
            <div
                style={{
                    fontSize: 11,
                    color: theme.textSecondary,
                    marginBottom: 10,
                    lineHeight: 1.4,
                }}
            >
                {DESCRIPTIONS[colorMode]}
            </div>
            <div style={{ position: "relative", width: "100%", marginBottom: 4 }}>
                <div
                    style={{
                        width: "100%",
                        height: 6,
                        borderRadius: 3,
                        background: gradient,
                    }}
                />
                {tickPct !== null && (
                    <div
                        style={{
                            position: "absolute",
                            left: tickPct,
                            top: 0,
                            width: 1,
                            height: 10,
                            background: theme.textSecondary,
                            transform: "translateX(-50%)",
                        }}
                    />
                )}
            </div>
            {/* 3-column label row — no absolute positioning, no overlap */}
            <div
                style={{
                    display: "flex",
                    alignItems: "center",
                    marginTop: 6,
                    marginBottom: 14,
                    fontSize: 11,
                }}
            >
                <span style={{ flex: 1, color: "#4d9221" }}>{labelLeft}</span>
                {tickPct !== null && (
                    <span style={{ color: theme.textSecondary }}>{tickLabel}</span>
                )}
                <span
                    style={{ flex: 1, color: "#c51b7d", textAlign: "right" }}
                >
                    {labelRight}
                </span>
            </div>

            {/* Divider */}
            <div
                style={{
                    borderTop: "1px solid rgba(148,163,184,0.1)",
                    marginBottom: 12,
                }}
            />

            {/* Thickness section */}
            <div style={SECTION_HEADER}>{thicknessTitle}</div>
            {thicknessItems.map((item) => (
                <div
                    key={item.label}
                    style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 10,
                        marginBottom: 5,
                    }}
                >
                    <span
                        style={{
                            width: 28,
                            height: item.weight,
                            borderRadius: item.weight / 2,
                            background: theme.textSecondary,
                            display: "inline-block",
                            flexShrink: 0,
                        }}
                    />
                    <span style={{ fontSize: 11, color: theme.textSecondary }}>
                        {item.label}
                    </span>
                </div>
            ))}

            {/* Divider */}
            <div
                style={{
                    borderTop: "1px solid rgba(148,163,184,0.1)",
                    margin: "12px 0",
                }}
            />

            {/* Route Focus section */}
            <div style={SECTION_HEADER}>Route focus</div>
            <input
                type="range"
                min={0}
                max={TOTAL_ROUTES - 1}
                value={focusLevel}
                onChange={(e) => onFocusLevelChange(Number(e.target.value))}
                className="focus-slider"
                style={
                    {
                        "--pct": `${(focusLevel / (TOTAL_ROUTES - 1)) * 100}%`,
                    } as React.CSSProperties
                }
            />
            <div
                style={{
                    display: "flex",
                    justifyContent: "space-between",
                    fontSize: 10,
                    color: theme.textDim,
                    marginTop: 4,
                    marginBottom: 6,
                }}
            >
                <span>All</span>
                <span>Worst only</span>
            </div>
            <div
                style={{
                    fontSize: 11,
                    color: focusLevel === 0 ? theme.textSecondary : "#a5b4fc",
                    textAlign: "center",
                    fontWeight: focusLevel === 0 ? 400 : 600,
                }}
            >
                {focusLevel === 0
                    ? "All routes"
                    : `Top ${TOTAL_ROUTES - focusLevel} of ${TOTAL_ROUTES}`}
            </div>
        </div>
    );
}

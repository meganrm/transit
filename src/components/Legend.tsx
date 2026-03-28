import type { MetricMode, TrafficMode } from "../types";
import { weightScale, theme } from "../constants";
import {
    buildLegendGradient,
    getLegendEqualPct,
    getLegendBreakevenPct,
    getPersonMinutesMax,
    getCommuterRange,
} from "../utils/routeColor";

function formatCommuters(n: number): string {
    if (!Number.isFinite(n)) return "?";
    if (n >= 1000) return `~${Math.round(n / 100) / 10}k`;
    return `~${Math.round(n)}`;
}

function formatPersonMinutes(n: number): string {
    if (!Number.isFinite(n) || n <= 0) return "?";
    const k = n / 1000;
    return k >= 10 ? `~${Math.round(k)}k` : `~${k.toFixed(1)}k`;
}

const SECTION_HEADER: React.CSSProperties = {
    fontSize: 9,
    color: theme.textDim,
    textTransform: "uppercase",
    letterSpacing: "0.08em",
    marginBottom: 6,
};

interface Props {
    trafficMode: TrafficMode;
    onTrafficModeChange: (mode: TrafficMode) => void;
    metricMode: MetricMode;
    onMetricModeChange: (mode: MetricMode) => void;
    routeCount: number;
    focusLevel: number;
    onFocusLevelChange: (level: number) => void;
}

function ToggleRow({
    label,
    valueLabel,
    checked,
    onToggle,
}: {
    label: string;
    valueLabel: string;
    checked: boolean;
    onToggle: () => void;
}) {
    return (
        <button
            onClick={onToggle}
            style={{
                width: "100%",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                border: "1px solid rgba(148,163,184,0.18)",
                background: "rgba(148,163,184,0.06)",
                borderRadius: 8,
                padding: "8px 10px",
                cursor: "pointer",
                color: theme.textPrimary,
                marginBottom: 8,
            }}
        >
            <span style={{ fontSize: 11, color: theme.textSecondary }}>
                {label}
            </span>
            <span
                style={{
                    fontSize: 11,
                    color: checked ? "#a5b4fc" : theme.textSecondary,
                    fontWeight: 600,
                }}
            >
                {valueLabel}
            </span>
        </button>
    );
}

export function Legend({
    trafficMode,
    onTrafficModeChange,
    metricMode,
    onMetricModeChange,
    routeCount,
    focusLevel,
    onFocusLevelChange,
}: Props) {
    const gradient = buildLegendGradient(trafficMode, metricMode);
    const equalPct = getLegendEqualPct(trafficMode, metricMode);
    const breakevenPct = getLegendBreakevenPct(trafficMode);

    const isPersonMinutes = metricMode === "person-minutes-lost";
    const tickPct = isPersonMinutes ? breakevenPct : equalPct;
    const tickLabel = isPersonMinutes ? "breakeven" : "equal";
    const labelLeft = isPersonMinutes ? "Saves time" : "Faster";
    const labelRight = isPersonMinutes ? "Time tax" : "Slower";
    const trafficLabel =
        trafficMode === "peak-traffic" ? "Peak Traffic" : "No Traffic";
    const sectionTitle = isPersonMinutes
        ? `Transit Time Tax (${trafficLabel})`
        : `Transit vs ${trafficLabel}`;
    const sectionDescription = isPersonMinutes
        ? "Collective time cost if all commuters switched to transit."
        : trafficMode === "peak-traffic"
          ? "Travel-time difference using rush-hour driving as the baseline."
          : "Travel-time difference using uncongested driving as the baseline.";

    const pmMax = getPersonMinutesMax(trafficMode);
    const { min: cMin, max: cMax } = getCommuterRange();
    const cMid = Math.round((cMin + cMax) / 2);
    const midWeight = (weightScale.minWeight + weightScale.maxWeight) / 2;
    const thicknessItems = isPersonMinutes
        ? [
              { weight: weightScale.minWeight, label: "0 min tax" },
              { weight: midWeight, label: `${formatPersonMinutes(pmMax / 2)} min/day` },
              { weight: weightScale.maxWeight, label: `${formatPersonMinutes(pmMax)} min/day` },
          ]
        : [
              { weight: weightScale.minWeight, label: `${formatCommuters(cMin)}/day` },
              { weight: midWeight, label: `${formatCommuters(cMid)}/day` },
              { weight: weightScale.maxWeight, label: `${formatCommuters(cMax)}/day` },
          ];
    const thicknessTitle = isPersonMinutes
        ? "Line thickness"
        : "Daily commuters";

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
            <div style={SECTION_HEADER}>Color Controls</div>
            <ToggleRow
                label="Peak traffic"
                valueLabel={trafficMode === "peak-traffic" ? "On" : "Off"}
                checked={trafficMode === "peak-traffic"}
                onToggle={() =>
                    onTrafficModeChange(
                        trafficMode === "peak-traffic"
                            ? "no-traffic"
                            : "peak-traffic",
                    )
                }
            />
            <ToggleRow
                label="Metric"
                valueLabel={
                    isPersonMinutes
                        ? "Transit time tax"
                        : "Travel time difference"
                }
                checked={isPersonMinutes}
                onToggle={() =>
                    onMetricModeChange(
                        isPersonMinutes
                            ? "travel-time-difference"
                            : "person-minutes-lost",
                    )
                }
            />

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
                {sectionDescription}
            </div>
            <div
                style={{ position: "relative", width: "100%", marginBottom: 4 }}
            >
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
                    <span style={{ color: theme.textSecondary }}>
                        {tickLabel}
                    </span>
                )}
                <span style={{ flex: 1, color: "#c51b7d", textAlign: "right" }}>
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
                min={-Math.max(routeCount - 1, 0)}
                max={Math.max(routeCount - 1, 0)}
                value={focusLevel}
                onChange={(e) => onFocusLevelChange(Number(e.target.value))}
                className="focus-slider"
                style={(() => {
                    const total = routeCount > 1 ? routeCount - 1 : 1;
                    const pct = ((focusLevel + total) / (2 * total)) * 100;
                    return {
                        "--left-pct": focusLevel <= 0 ? `${pct}%` : "50%",
                        "--right-pct": focusLevel >= 0 ? `${pct}%` : "50%",
                        "--fill-color": focusLevel < 0 ? "#4ade80" : "#6366f1",
                    } as React.CSSProperties;
                })()}
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
                <span>Best</span>
                <span>All</span>
                <span>Worst</span>
            </div>
            <div
                style={{
                    fontSize: 11,
                    color: focusLevel === 0 ? theme.textSecondary : focusLevel < 0 ? "#4ade80" : "#a5b4fc",
                    textAlign: "center",
                    fontWeight: focusLevel === 0 ? 400 : 600,
                }}
            >
                {focusLevel === 0
                    ? "All routes"
                    : focusLevel < 0
                      ? `Best ${routeCount - Math.abs(focusLevel)} of ${routeCount}`
                      : `Worst ${routeCount - focusLevel} of ${routeCount}`}
            </div>
        </div>
    );
}

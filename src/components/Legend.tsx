import { METRIC_MODE, TRAFFIC_MODE } from "../types";
import type { MetricMode, TrafficMode } from "../types";
import { weightScale, theme, ui } from "../constants";
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
    worstCount: number;
    onWorstCountChange: (count: number) => void;
    bestCount: number;
    onBestCountChange: (count: number) => void;
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
                    color: checked ? ui.status.warning : theme.textSecondary,
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
    worstCount,
    onWorstCountChange,
    bestCount,
    onBestCountChange,
}: Props) {
    const gradient = buildLegendGradient(trafficMode, metricMode);
    const equalPct = getLegendEqualPct(trafficMode, metricMode);
    const breakevenPct = getLegendBreakevenPct(trafficMode);

    const isPersonMinutes = metricMode === METRIC_MODE.PERSON_MINUTES_LOST;
    const tickPct = isPersonMinutes ? breakevenPct : equalPct;
    const tickLabel = isPersonMinutes ? "breakeven" : "equal";
    const labelLeft = isPersonMinutes ? "Saves time" : "Faster";
    const labelRight = isPersonMinutes ? "Time tax" : "Slower";
    const trafficLabel =
        trafficMode === TRAFFIC_MODE.PEAK_TRAFFIC
            ? "Peak Traffic"
            : "No Traffic";
    const sectionTitle = isPersonMinutes
        ? "Transit Time Tax"
        : `Transit vs ${trafficLabel}`;
    const sectionDescription = isPersonMinutes
        ? trafficMode === TRAFFIC_MODE.PEAK_TRAFFIC
            ? "Time lost daily if all commuters switched to transit vs. peak-hour driving."
            : "Time lost daily if all commuters switched to transit vs. off-peak driving."
        : trafficMode === TRAFFIC_MODE.PEAK_TRAFFIC
          ? "Travel-time difference using rush-hour driving as the baseline."
          : "Travel-time difference using uncongested driving as the baseline.";

    const pmMax = getPersonMinutesMax(trafficMode);
    const { min: cMin, max: cMax } = getCommuterRange();
    const cMid = Math.round((cMin + cMax) / 2);
    const midWeight = (weightScale.minWeight + weightScale.maxWeight) / 2;
    const thicknessItems = isPersonMinutes
        ? [
              { weight: weightScale.minWeight, label: "0 min tax" },
              {
                  weight: midWeight,
                  label: `${formatPersonMinutes(pmMax / 2)} min/day`,
              },
              {
                  weight: weightScale.maxWeight,
                  label: `${formatPersonMinutes(pmMax)} min/day`,
              },
          ]
        : [
              {
                  weight: weightScale.minWeight,
                  label: `${formatCommuters(cMin)}/day`,
              },
              { weight: midWeight, label: `${formatCommuters(cMid)}/day` },
              {
                  weight: weightScale.maxWeight,
                  label: `${formatCommuters(cMax)}/day`,
              },
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
                valueLabel={
                    trafficMode === TRAFFIC_MODE.PEAK_TRAFFIC ? "On" : "Off"
                }
                checked={trafficMode === TRAFFIC_MODE.PEAK_TRAFFIC}
                onToggle={() =>
                    onTrafficModeChange(
                        trafficMode === TRAFFIC_MODE.PEAK_TRAFFIC
                            ? TRAFFIC_MODE.NO_TRAFFIC
                            : TRAFFIC_MODE.PEAK_TRAFFIC,
                    )
                }
            />
            <div
                style={{
                    fontSize: 10,
                    color: theme.textDim,
                    marginTop: -4,
                    marginBottom: 6,
                }}
            >
                Also colors neighborhood dots
            </div>
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
                            ? METRIC_MODE.TRAVEL_TIME_DIFFERENCE
                            : METRIC_MODE.PERSON_MINUTES_LOST,
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
                <span style={{ flex: 1, color: ui.accent.positiveLabel }}>
                    {labelLeft}
                </span>
                {tickPct !== null && (
                    <span style={{ color: theme.textSecondary }}>
                        {tickLabel}
                    </span>
                )}
                <span
                    style={{
                        flex: 1,
                        color: ui.accent.negativeLabel,
                        textAlign: "right",
                    }}
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

            {/* Worst routes slider */}
            <div style={SECTION_HEADER}>Worst routes</div>
            <input
                type="range"
                min={0}
                max={routeCount}
                value={worstCount}
                onChange={(e) => onWorstCountChange(Number(e.target.value))}
                className="focus-slider"
                style={
                    {
                        "--fill-color": ui.sliderFill.worst,
                        "--left-pct": "0%",
                        "--right-pct": `${(worstCount / Math.max(routeCount, 1)) * 100}%`,
                    } as React.CSSProperties
                }
            />
            <div
                style={{
                    fontSize: 11,
                    color:
                        worstCount === 0
                            ? theme.textSecondary
                            : ui.status.warning,
                    textAlign: "center",
                    fontWeight: worstCount === 0 ? 400 : 600,
                    marginBottom: 10,
                }}
            >
                {worstCount === 0
                    ? "None highlighted"
                    : `Worst ${worstCount} of ${routeCount}`}
            </div>

            {/* Best routes slider */}
            <div style={SECTION_HEADER}>Best routes</div>
            <input
                type="range"
                min={0}
                max={routeCount}
                value={bestCount}
                onChange={(e) => onBestCountChange(Number(e.target.value))}
                className="focus-slider"
                style={
                    {
                        "--fill-color": ui.sliderFill.best,
                        "--left-pct": "0%",
                        "--right-pct": `${(bestCount / Math.max(routeCount, 1)) * 100}%`,
                    } as React.CSSProperties
                }
            />
            <div
                style={{
                    fontSize: 11,
                    color:
                        bestCount === 0
                            ? theme.textSecondary
                            : ui.status.success,
                    textAlign: "center",
                    fontWeight: bestCount === 0 ? 400 : 600,
                }}
            >
                {bestCount === 0
                    ? "None highlighted"
                    : `Best ${bestCount} of ${routeCount}`}
            </div>
        </div>
    );
}

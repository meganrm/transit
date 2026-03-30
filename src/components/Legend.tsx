import { METRIC_MODE, TRAFFIC_MODE } from "../types";
import type { MetricMode, TrafficMode, Route } from "../types";
import { weightScale, theme, ui, transitReasonThresholds } from "../constants";
import {
    buildLegendGradientRemapped,
    getPersonMinutesMax,
    getCommuterRange,
} from "../utils/routeColor";

const LABELS = {
    sectionHeader: "Color Controls",
    toggle: {
        peakTraffic: "Peak traffic",
        metric: "Metric",
        peakOn: "On",
        peakOff: "Off",
        metricPersonMinutes: "Transit time tax",
        metricRatio: "Travel time difference",
        neighborhoodNote: "Also colors neighborhood dots",
    },
    sectionTitle: {
        personMinutes: "Transit Time Tax",
        ratio: (trafficLabel: string) => `Transit vs ${trafficLabel}`,
    },
    trafficLabel: {
        peak: "Peak Traffic",
        noPeak: "No Traffic",
    },
    description: {
        personMinutesPeak:
            "Time lost daily if all commuters switched to transit vs. peak-hour driving.",
        personMinutesNoPeak:
            "Time lost daily if all commuters switched to transit vs. off-peak driving.",
        ratioPeak:
            "Travel-time difference using rush-hour driving as the baseline.",
        ratioNoPeak:
            "Travel-time difference using uncongested driving as the baseline.",
    },
    directionLabel: {
        personMinutesLeft: "Saves time",
        personMinutesRight: "Time tax",
        ratioLeft: "Faster",
        ratioRight: "Slower",
        breakeven: "breakeven",
    },
    thickness: {
        personMinutesTitle: "Line thickness",
        ratioTitle: "Daily commuters",
        zeroTax: "0 min tax",
    },
    filters: {
        distance: "Distance (miles)",
        delayReasons: "Delay reasons",
        reasonTransfer: "Transfer",
        reasonLongWait: "Long wait",
        reasonWalking: "Walking",
    },
} as const;

const REASON_COLORS: Record<string, string> = {
    transfer: "#f59e0b",
    longWait: "#f97316",
    walking: "#38bdf8",
};

const REASON_KEYS: { key: string; label: string }[] = [
    { key: "transfer", label: LABELS.filters.reasonTransfer },
    { key: "longWait", label: LABELS.filters.reasonLongWait },
    { key: "walking", label: LABELS.filters.reasonWalking },
];

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

function routeMatchesReasonLocal(
    route: Route,
    reason: string,
): boolean {
    const { longWaitMinutes, longWalkMinutes } = transitReasonThresholds;
    switch (reason) {
        case "transfer":
            return route.transitTransfers >= 1;
        case "longWait":
            return route.transitMaxWaitMinutes >= longWaitMinutes;
        case "walking":
            return route.transitWalkMinutes >= longWalkMinutes;
        default:
            return false;
    }
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
    filterMin: number;
    onFilterMinChange: (val: number) => void;
    filterMax: number;
    onFilterMaxChange: (val: number) => void;
    selectedTiers: Set<number>;
    onTiersChange: (tiers: Set<number>) => void;
    distanceMin: number;
    onDistanceMinChange: (val: number) => void;
    distanceMax: number;
    onDistanceMaxChange: (val: number) => void;
    distanceRangeMiles: { min: number; max: number };
    selectedReasons: Set<string>;
    onReasonsChange: (reasons: Set<string>) => void;
    routes: Route[];
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

function RangeSlider({
    gradient,
    filterMin,
    filterMax,
    onFilterMinChange,
    onFilterMaxChange,
}: {
    gradient: string;
    filterMin: number;
    filterMax: number;
    onFilterMinChange: (v: number) => void;
    onFilterMaxChange: (v: number) => void;
}) {
    return (
        <div
            className="range-slider-track"
            style={
                {
                    "--left-pct": `${filterMin}%`,
                    "--right-pct": `${filterMax}%`,
                } as React.CSSProperties
            }
        >
            <div
                className="range-slider-fill"
                style={{ background: gradient }}
            />
            <input
                type="range"
                min={0}
                max={100}
                value={filterMin}
                className="range-slider-input"
                onChange={(e) => {
                    const v = Number(e.target.value);
                    if (v < filterMax) onFilterMinChange(v);
                }}
            />
            <input
                type="range"
                min={0}
                max={100}
                value={filterMax}
                className="range-slider-input"
                onChange={(e) => {
                    const v = Number(e.target.value);
                    if (v > filterMin) onFilterMaxChange(v);
                }}
            />
        </div>
    );
}

export function Legend({
    trafficMode,
    onTrafficModeChange,
    metricMode,
    onMetricModeChange,
    filterMin,
    onFilterMinChange,
    filterMax,
    onFilterMaxChange,
    selectedTiers,
    onTiersChange,
    distanceMin,
    onDistanceMinChange,
    distanceMax,
    onDistanceMaxChange,
    distanceRangeMiles,
    selectedReasons,
    onReasonsChange,
    routes,
}: Props) {
    const gradient = buildLegendGradientRemapped(trafficMode, metricMode);

    const isPersonMinutes = metricMode === METRIC_MODE.PERSON_MINUTES_LOST;
    const labelLeft = isPersonMinutes
        ? LABELS.directionLabel.personMinutesLeft
        : LABELS.directionLabel.ratioLeft;
    const labelRight = isPersonMinutes
        ? LABELS.directionLabel.personMinutesRight
        : LABELS.directionLabel.ratioRight;
    const trafficLabel =
        trafficMode === TRAFFIC_MODE.PEAK_TRAFFIC
            ? LABELS.trafficLabel.peak
            : LABELS.trafficLabel.noPeak;
    const sectionTitle = isPersonMinutes
        ? LABELS.sectionTitle.personMinutes
        : LABELS.sectionTitle.ratio(trafficLabel);
    const sectionDescription = isPersonMinutes
        ? trafficMode === TRAFFIC_MODE.PEAK_TRAFFIC
            ? LABELS.description.personMinutesPeak
            : LABELS.description.personMinutesNoPeak
        : trafficMode === TRAFFIC_MODE.PEAK_TRAFFIC
          ? LABELS.description.ratioPeak
          : LABELS.description.ratioNoPeak;

    const pmMax = getPersonMinutesMax(trafficMode);
    const { min: cMin, max: cMax } = getCommuterRange();
    const cMid = Math.round((cMin + cMax) / 2);
    const midWeight = (weightScale.minWeight + weightScale.maxWeight) / 2;
    const thicknessItems = isPersonMinutes
        ? [
              { weight: weightScale.minWeight, label: LABELS.thickness.zeroTax },
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
        ? LABELS.thickness.personMinutesTitle
        : LABELS.thickness.ratioTitle;

    const dMin = distanceRangeMiles.min;
    const dMax = distanceRangeMiles.max;

    // Convert distance state (0–100) to miles within [dMin, dMax]
    const distanceMinMiles = Math.round(dMin + (distanceMin / 100) * (dMax - dMin));
    const distanceMaxMiles = Math.round(dMin + (distanceMax / 100) * (dMax - dMin));

    const handleDistanceMinChange = (v: number) => {
        if (v < distanceMax) onDistanceMinChange(v);
    };
    const handleDistanceMaxChange = (v: number) => {
        if (v > distanceMin) onDistanceMaxChange(v);
    };

    const distanceGradient = `linear-gradient(to right, ${theme.textSecondary}, ${theme.textSecondary})`;

    // Which delay reasons have at least 1 matching route
    const availableReasons = REASON_KEYS.filter(({ key }) =>
        routes.some((r) => routeMatchesReasonLocal(r, key)),
    );

    const handleTierClick = (tier: number) => {
        const next = new Set(selectedTiers);
        if (next.has(tier)) {
            next.delete(tier);
        } else {
            next.add(tier);
        }
        onTiersChange(next);
    };

    const handleReasonClick = (reason: string) => {
        const next = new Set(selectedReasons);
        if (next.has(reason)) {
            next.delete(reason);
        } else {
            next.add(reason);
        }
        onReasonsChange(next);
    };

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
            <div style={SECTION_HEADER}>{LABELS.sectionHeader}</div>
            <ToggleRow
                label={LABELS.toggle.peakTraffic}
                valueLabel={
                    trafficMode === TRAFFIC_MODE.PEAK_TRAFFIC
                        ? LABELS.toggle.peakOn
                        : LABELS.toggle.peakOff
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
                {LABELS.toggle.neighborhoodNote}
            </div>
            <ToggleRow
                label={LABELS.toggle.metric}
                valueLabel={
                    isPersonMinutes
                        ? LABELS.toggle.metricPersonMinutes
                        : LABELS.toggle.metricRatio
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

            {/* Route filter slider */}
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
            <RangeSlider
                gradient={gradient}
                filterMin={filterMin}
                filterMax={filterMax}
                onFilterMinChange={onFilterMinChange}
                onFilterMaxChange={onFilterMaxChange}
            />
            <div
                style={{
                    display: "flex",
                    justifyContent: "space-between",
                    fontSize: 11,
                    marginBottom: 14,
                }}
            >
                <span style={{ color: ui.accent.positiveLabel }}>
                    {labelLeft}
                </span>
                <span style={{ color: theme.textDim }}>{LABELS.directionLabel.breakeven}</span>
                <span style={{ color: ui.accent.negativeLabel }}>
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

            {/* Thickness / ridership tier section */}
            <div style={SECTION_HEADER}>{thicknessTitle}</div>
            {thicknessItems.map((item, i) => {
                const isSelected = selectedTiers.has(i);
                return (
                    <button
                        key={item.label}
                        onClick={() => handleTierClick(i)}
                        style={{
                            display: "flex",
                            alignItems: "center",
                            gap: 10,
                            marginBottom: 5,
                            width: "100%",
                            background: isSelected
                                ? "rgba(148,163,184,0.12)"
                                : "none",
                            border: isSelected
                                ? "1px solid rgba(148,163,184,0.35)"
                                : "1px solid transparent",
                            borderRadius: 6,
                            padding: "3px 6px",
                            cursor: "pointer",
                            color: theme.textPrimary,
                            textAlign: "left",
                        }}
                    >
                        <span
                            style={{
                                width: 28,
                                height: item.weight,
                                borderRadius: item.weight / 2,
                                background: isSelected
                                    ? theme.textPrimary
                                    : theme.textSecondary,
                                display: "inline-block",
                                flexShrink: 0,
                            }}
                        />
                        <span
                            style={{
                                fontSize: 11,
                                color: isSelected
                                    ? theme.textPrimary
                                    : theme.textSecondary,
                            }}
                        >
                            {item.label}
                        </span>
                    </button>
                );
            })}

            {/* Divider */}
            <div
                style={{
                    borderTop: "1px solid rgba(148,163,184,0.1)",
                    margin: "10px 0",
                }}
            />

            {/* Distance filter */}
            <div style={SECTION_HEADER}>{LABELS.filters.distance}</div>
            <RangeSlider
                gradient={distanceGradient}
                filterMin={distanceMin}
                filterMax={distanceMax}
                onFilterMinChange={handleDistanceMinChange}
                onFilterMaxChange={handleDistanceMaxChange}
            />
            <div
                style={{
                    display: "flex",
                    justifyContent: "space-between",
                    fontSize: 11,
                    color: theme.textSecondary,
                    marginBottom: 12,
                }}
            >
                <span>{distanceMinMiles} mi</span>
                <span>{distanceMaxMiles} mi</span>
            </div>

            {/* Delay reason filter */}
            {availableReasons.length > 0 && (
                <>
                    <div
                        style={{
                            borderTop: "1px solid rgba(148,163,184,0.1)",
                            marginBottom: 10,
                        }}
                    />
                    <div style={SECTION_HEADER}>{LABELS.filters.delayReasons}</div>
                    <div style={{ display: "flex", gap: 5, flexWrap: "wrap" }}>
                        {availableReasons.map(({ key, label }) => {
                            const color = REASON_COLORS[key];
                            const isSelected = selectedReasons.has(key);
                            return (
                                <button
                                    key={key}
                                    onClick={() => handleReasonClick(key)}
                                    style={{
                                        fontSize: 11,
                                        background: isSelected
                                            ? `${color}33`
                                            : `${color}11`,
                                        color,
                                        border: isSelected
                                            ? `1px solid ${color}`
                                            : `1px solid ${color}55`,
                                        padding: "2px 8px",
                                        borderRadius: 12,
                                        cursor: "pointer",
                                        whiteSpace: "nowrap",
                                    }}
                                >
                                    {label}
                                </button>
                            );
                        })}
                    </div>
                </>
            )}
        </div>
    );
}

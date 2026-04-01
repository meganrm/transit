import { useState } from "react";
import { METRIC_MODE, TRAFFIC_MODE } from "../types";
import type { MetricMode, TrafficMode, Route } from "../types";
import { weightScale, theme, ui, transitReasonThresholds } from "../constants";
import {
    getPersonMinutesMax,
    FILTER_SLIDER_GRADIENT_CSS,
} from "../utils/routeColor";
import { RangeSlider } from "./RangeSlider";

const LABELS = {
    sectionHeader: "Color Controls",
    colorBy: "Color by",
    colorByOptions: {
        timeDiff: "Time diff",
        personMins: "Person mins",
        delayReason: "Delay reason",
    },
    toggle: {
        peakTraffic: "Peak traffic",
        peakOn: "On",
        peakOff: "Off",
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
        tierShow: "Show",
        tierHide: "Hide",
    },
    colorKey: {
        title: "Color key",
        longWait: "Long transfer wait",
        transfer: "Transfer required",
        walking: "Long walk",
        none: "No major delay",
        show: "Show",
        hide: "Hide",
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

function routeMatchesReasonLocal(route: Route, reason: string): boolean {
    const { longWaitMinutes, longWalkMinutes, walkingSlowThresholdMinutes } =
        transitReasonThresholds;
    switch (reason) {
        case "transfer":
            return route.transitTransfers >= 1;
        case "longWait":
            return route.transitMaxWaitMinutes >= longWaitMinutes;
        case "walking":
            return (
                route.transitWalkMinutes >= longWalkMinutes &&
                route.transitMinutes - route.carMinutesPeak >
                    walkingSlowThresholdMinutes
            );
        default:
            return false;
    }
}

function EyeIcon() {
    return (
        <svg
            width="12"
            height="12"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
        >
            <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
            <circle cx="12" cy="12" r="3" />
        </svg>
    );
}

function EyeOffIcon() {
    return (
        <svg
            width="12"
            height="12"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
        >
            <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94" />
            <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19" />
            <line x1="1" y1="1" x2="23" y2="23" />
        </svg>
    );
}

const COLOR_BY_OPTIONS = [
    {
        value: METRIC_MODE.TRAVEL_TIME_DIFFERENCE,
        label: LABELS.colorByOptions.timeDiff,
    },
    {
        value: METRIC_MODE.PERSON_MINUTES_LOST,
        label: LABELS.colorByOptions.personMins,
    },
    {
        value: METRIC_MODE.DELAY_REASON,
        label: LABELS.colorByOptions.delayReason,
    },
] as const;

function ColorBySelector({
    mode,
    onChange,
}: {
    mode: MetricMode;
    onChange: (m: MetricMode) => void;
}) {
    return (
        <div style={{ marginBottom: 8 }}>
            <div
                style={{
                    fontSize: 11,
                    color: theme.textSecondary,
                    marginBottom: 4,
                }}
            >
                {LABELS.colorBy}
            </div>
            <div style={{ display: "flex", gap: 4 }}>
                {COLOR_BY_OPTIONS.map(({ value, label }) => {
                    const active = mode === value;
                    return (
                        <button
                            key={value}
                            onClick={() => onChange(value)}
                            style={{
                                flex: 1,
                                fontSize: 10,
                                padding: "4px 2px",
                                borderRadius: 6,
                                border: active
                                    ? "1px solid rgba(148,163,184,0.5)"
                                    : "1px solid rgba(148,163,184,0.15)",
                                background: active
                                    ? "rgba(148,163,184,0.15)"
                                    : "rgba(148,163,184,0.04)",
                                color: active
                                    ? theme.textPrimary
                                    : theme.textSecondary,
                                cursor: "pointer",
                                fontWeight: active ? 600 : 400,
                            }}
                        >
                            {label}
                        </button>
                    );
                })}
            </div>
        </div>
    );
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
    hiddenTiers: Set<number>;
    onHiddenTiersChange: (tiers: Set<number>) => void;
    commuterThresholds: { p33: number; p67: number };
    distanceMin: number;
    onDistanceMinChange: (val: number) => void;
    distanceMax: number;
    onDistanceMaxChange: (val: number) => void;
    distanceRangeMiles: { min: number; max: number };
    selectedReasons: Set<string>;
    onReasonsChange: (reasons: Set<string>) => void;
    hiddenDelayReasons: Set<string>;
    onHiddenDelayReasonsChange: (reasons: Set<string>) => void;
    selectedRouteName: string | null;
    onClearSelection: () => void;
    routes: Route[];
    dataSource: { label: string; generatedAt: string | null; error: string | null } | null;
    isMobile?: boolean;
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
    filterMin,
    onFilterMinChange,
    filterMax,
    onFilterMaxChange,
    hiddenTiers,
    onHiddenTiersChange,
    commuterThresholds,
    distanceMin,
    onDistanceMinChange,
    distanceMax,
    onDistanceMaxChange,
    distanceRangeMiles,
    selectedReasons,
    onReasonsChange,
    hiddenDelayReasons,
    onHiddenDelayReasonsChange,
    selectedRouteName,
    onClearSelection,
    routes,
    dataSource,
    isMobile,
}: Props) {
    const [mobileExpanded, setMobileExpanded] = useState(false);
    const gradient = FILTER_SLIDER_GRADIENT_CSS;

    const isRouteSelected = selectedRouteName !== null;
    const isDelayReason = metricMode === METRIC_MODE.DELAY_REASON;
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
    const midWeight = (weightScale.minWeight + weightScale.maxWeight) / 2;
    const { p33, p67 } = commuterThresholds;
    const thicknessItems = isPersonMinutes
        ? [
              {
                  weight: weightScale.minWeight,
                  label: LABELS.thickness.zeroTax,
              },
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
                  label: `≤${formatCommuters(p33)}/day`,
              },
              {
                  weight: midWeight,
                  label: `${formatCommuters(p33)}–${formatCommuters(p67)}/day`,
              },
              {
                  weight: weightScale.maxWeight,
                  label: `>${formatCommuters(p67)}/day`,
              },
          ];
    const thicknessTitle = isPersonMinutes
        ? LABELS.thickness.personMinutesTitle
        : LABELS.thickness.ratioTitle;

    const dMin = distanceRangeMiles.min;
    const dMax = distanceRangeMiles.max;

    // Convert distance state (0–100) to miles within [dMin, dMax]
    const distanceMinMiles = Math.round(
        dMin + (distanceMin / 100) * (dMax - dMin),
    );
    const distanceMaxMiles = Math.round(
        dMin + (distanceMax / 100) * (dMax - dMin),
    );

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
        const next = new Set(hiddenTiers);
        if (next.has(tier)) {
            next.delete(tier);
        } else {
            next.add(tier);
        }
        onHiddenTiersChange(next);
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

    const handleDelayReasonHide = (key: string) => {
        const next = new Set(hiddenDelayReasons);
        if (next.has(key)) {
            next.delete(key);
        } else {
            next.add(key);
        }
        onHiddenDelayReasonsChange(next);
    };

    const containerStyle: React.CSSProperties = isMobile
        ? {
              position: "relative",
              width: "100%",
              background: theme.bgOverlay,
              color: theme.textPrimary,
              borderRadius: 0,
              padding: "10px 16px",
              boxShadow: "0 2px 8px rgba(0,0,0,0.3)",
              zIndex: 1000,
              overflowY: mobileExpanded ? "auto" : "hidden",
              maxHeight: mobileExpanded ? "60vh" : undefined,
              borderBottom: "1px solid rgba(148,163,184,0.12)",
          }
        : {
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
          };

    return (
        <div style={containerStyle}>
            {isMobile && (
                <button
                    onClick={() => setMobileExpanded(!mobileExpanded)}
                    style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        width: "100%",
                        background: "none",
                        border: "none",
                        padding: 0,
                        paddingBottom: mobileExpanded ? 12 : 0,
                        cursor: "pointer",
                        color: theme.textPrimary,
                    }}
                >
                    <span
                        style={{
                            fontSize: 12,
                            fontWeight: 600,
                            letterSpacing: "0.05em",
                            textTransform: "uppercase",
                            color: theme.textSecondary,
                        }}
                    >
                        Filters
                    </span>
                    <span style={{ fontSize: 12, color: theme.textSecondary }}>
                        {mobileExpanded ? "▴" : "▾"}
                    </span>
                </button>
            )}
            {(!isMobile || mobileExpanded) && isRouteSelected && (
                <div
                    style={{
                        background: "rgba(148,163,184,0.07)",
                        border: "1px solid rgba(148,163,184,0.15)",
                        borderRadius: 6,
                        padding: "8px 10px",
                        marginBottom: 10,
                        display: "flex",
                        alignItems: "flex-start",
                        justifyContent: "space-between",
                        gap: 8,
                    }}
                >
                    <div>
                        <div
                            style={{
                                fontSize: 11,
                                fontWeight: 600,
                                color: theme.textPrimary,
                                marginBottom: 2,
                            }}
                        >
                            {selectedRouteName}
                        </div>
                        <div
                            style={{
                                fontSize: 10,
                                color: theme.textSecondary,
                                lineHeight: 1.4,
                            }}
                        >
                            Clear selection to see filtered routes
                        </div>
                    </div>
                    <button
                        onClick={onClearSelection}
                        style={{
                            background: "none",
                            border: "1px solid rgba(148,163,184,0.25)",
                            borderRadius: 4,
                            color: theme.textSecondary,
                            fontSize: 10,
                            padding: "2px 7px",
                            cursor: "pointer",
                            flexShrink: 0,
                            marginTop: 1,
                        }}
                    >
                        Clear
                    </button>
                </div>
            )}
            {(!isMobile || mobileExpanded) && <div style={{ opacity: isRouteSelected ? 0.4 : 1 }}>
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
                <ColorBySelector
                    mode={metricMode}
                    onChange={onMetricModeChange}
                />

                {/* Route filter slider — hidden in delay reason mode */}
                {!isDelayReason && (
                    <>
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
                            valueMin={filterMin}
                            valueMax={filterMax}
                            onMinChange={onFilterMinChange}
                            onMaxChange={onFilterMaxChange}
                            staticGradient
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
                            <span style={{ color: theme.textDim }}>
                                {LABELS.directionLabel.breakeven}
                            </span>
                            <span style={{ color: ui.accent.negativeLabel }}>
                                {labelRight}
                            </span>
                        </div>
                    </>
                )}

                {/* Delay reason color key — shown only in delay reason mode */}
                {isDelayReason && (
                    <div style={{ marginBottom: 14 }}>
                        <div style={SECTION_HEADER}>
                            {LABELS.colorKey.title}
                        </div>
                        {[
                            {
                                key: "longWait",
                                color: REASON_COLORS.longWait,
                                label: LABELS.colorKey.longWait,
                            },
                            {
                                key: "transfer",
                                color: REASON_COLORS.transfer,
                                label: LABELS.colorKey.transfer,
                            },
                            {
                                key: "walking",
                                color: REASON_COLORS.walking,
                                label: LABELS.colorKey.walking,
                            },
                            {
                                key: "none",
                                color: "#64748b",
                                label: LABELS.colorKey.none,
                            },
                        ].map(({ key, color, label }) => {
                            const isHidden = hiddenDelayReasons.has(key);
                            return (
                                <div
                                    key={key}
                                    style={{
                                        display: "flex",
                                        alignItems: "center",
                                        gap: 8,
                                        marginBottom: 5,
                                    }}
                                >
                                    <button
                                        onClick={() =>
                                            handleDelayReasonHide(key)
                                        }
                                        title={
                                            isHidden
                                                ? LABELS.colorKey.show
                                                : LABELS.colorKey.hide
                                        }
                                        style={{
                                            background: "none",
                                            border: "none",
                                            cursor: "pointer",
                                            padding: 0,
                                            color: isHidden
                                                ? theme.textDim
                                                : theme.textSecondary,
                                            display: "flex",
                                            alignItems: "center",
                                            flexShrink: 0,
                                        }}
                                    >
                                        {isHidden ? (
                                            <EyeOffIcon />
                                        ) : (
                                            <EyeIcon />
                                        )}
                                    </button>
                                    <span
                                        style={{
                                            display: "inline-block",
                                            width: 24,
                                            height: 4,
                                            borderRadius: 2,
                                            background: color,
                                            flexShrink: 0,
                                            opacity: isHidden ? 0.35 : 1,
                                        }}
                                    />
                                    <span
                                        style={{
                                            fontSize: 11,
                                            color: isHidden
                                                ? theme.textDim
                                                : theme.textSecondary,
                                        }}
                                    >
                                        {label}
                                    </span>
                                </div>
                            );
                        })}
                    </div>
                )}

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
                    const isHidden = hiddenTiers.has(i);
                    return (
                        <div
                            key={item.label}
                            style={{
                                display: "flex",
                                alignItems: "center",
                                gap: 8,
                                marginBottom: 5,
                            }}
                        >
                            <button
                                onClick={() => handleTierClick(i)}
                                title={
                                    isHidden
                                        ? LABELS.filters.tierShow
                                        : LABELS.filters.tierHide
                                }
                                style={{
                                    background: "none",
                                    border: "none",
                                    cursor: "pointer",
                                    padding: 0,
                                    color: isHidden
                                        ? theme.textDim
                                        : theme.textSecondary,
                                    display: "flex",
                                    alignItems: "center",
                                    flexShrink: 0,
                                }}
                            >
                                {isHidden ? <EyeOffIcon /> : <EyeIcon />}
                            </button>
                            <span
                                style={{
                                    width: 28,
                                    height: item.weight,
                                    borderRadius: item.weight / 2,
                                    background: theme.textSecondary,
                                    display: "inline-block",
                                    flexShrink: 0,
                                    opacity: isHidden ? 0.35 : 1,
                                }}
                            />
                            <span
                                style={{
                                    fontSize: 11,
                                    color: isHidden
                                        ? theme.textDim
                                        : theme.textSecondary,
                                }}
                            >
                                {item.label}
                            </span>
                        </div>
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
                    valueMin={distanceMin}
                    valueMax={distanceMax}
                    onMinChange={handleDistanceMinChange}
                    onMaxChange={handleDistanceMaxChange}
                    labelMin={`${distanceMinMiles} mi`}
                    labelMax={`${distanceMaxMiles} mi`}
                />

                {/* Delay reason filter */}
                {availableReasons.length > 0 && (
                    <>
                        <div
                            style={{
                                borderTop: "1px solid rgba(148,163,184,0.1)",
                                marginBottom: 10,
                            }}
                        />
                        <div style={SECTION_HEADER}>
                            {LABELS.filters.delayReasons}
                        </div>
                        <div
                            style={{
                                display: "flex",
                                gap: 5,
                                flexWrap: "wrap",
                            }}
                        >
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
            </div>}
            {(!isMobile || mobileExpanded) && dataSource && (
                <div
                    style={{
                        borderTop: "1px solid rgba(148,163,184,0.1)",
                        marginTop: 12,
                        paddingTop: 8,
                        fontSize: 9,
                        color: dataSource.error
                            ? ui.dataSourceBadge.errorText
                            : theme.textDim,
                        lineHeight: 1.5,
                    }}
                >
                    <div>Data source: {dataSource.label}</div>
                    {dataSource.generatedAt && (
                        <div>
                            Generated:{" "}
                            {new Date(dataSource.generatedAt).toLocaleString()}
                        </div>
                    )}
                    {dataSource.error && (
                        <div>Using fallback data ({dataSource.error})</div>
                    )}
                </div>
            )}
        </div>
    );
}

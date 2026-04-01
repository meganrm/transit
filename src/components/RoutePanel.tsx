import { TRAFFIC_MODE } from "../types";
import type { Route, TrafficMode, MetricMode } from "../types";
import { theme, ui, transitReasonThresholds } from "../constants";
import { getRouteRgb } from "../utils/routeColor";

const LABELS = {
    delayReasons: {
        sectionHeader: "Why it's slow",
        transfer: (n: number) => (n === 1 ? "1 transfer" : `${n} transfers`),
        longWait: (n: number) => `${n} min wait`,
        walking: (n: number) => `${n} min walk`,
    },
} as const;

const REASON_COLORS = {
    transfer: "#f59e0b",
    longWait: "#f97316",
    walking: "#38bdf8",
} as const;

function ReasonTag({
    label,
    color,
}: {
    label: string;
    color: string;
}) {
    return (
        <span
            style={{
                fontSize: 11,
                background: `${color}22`,
                color,
                border: `1px solid ${color}55`,
                padding: "2px 8px",
                borderRadius: 12,
                whiteSpace: "nowrap",
            }}
        >
            {label}
        </span>
    );
}

function DelayReasonTags({ route }: { route: Route }) {
    const { longWaitMinutes, longWalkMinutes, walkingSlowThresholdMinutes } = transitReasonThresholds;

    const tags: { label: string; color: string }[] = [];

    if (route.transitTransfers >= 1) {
        tags.push({
            label: LABELS.delayReasons.transfer(route.transitTransfers),
            color: REASON_COLORS.transfer,
        });
    }
    if (route.transitMaxWaitMinutes >= longWaitMinutes) {
        tags.push({
            label: LABELS.delayReasons.longWait(route.transitMaxWaitMinutes),
            color: REASON_COLORS.longWait,
        });
    }
    if (
        route.transitWalkMinutes >= longWalkMinutes &&
        route.transitMinutes - route.carMinutesPeak > walkingSlowThresholdMinutes
    ) {
        tags.push({
            label: LABELS.delayReasons.walking(route.transitWalkMinutes),
            color: REASON_COLORS.walking,
        });
    }

    if (tags.length === 0) return null;

    return (
        <div style={{ padding: "10px 20px 0" }}>
            <div
                style={{
                    fontSize: 10,
                    color: theme.textDim,
                    textTransform: "uppercase",
                    letterSpacing: "0.05em",
                    marginBottom: 6,
                }}
            >
                {LABELS.delayReasons.sectionHeader}
            </div>
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                {tags.map((t) => (
                    <ReasonTag key={t.label} label={t.label} color={t.color} />
                ))}
            </div>
        </div>
    );
}

interface Props {
    route: Route;
    onClose: () => void;
    trafficMode: TrafficMode;
    metricMode: MetricMode;
    isMobile?: boolean;
}

function CarIcon() {
    return (
        <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            style={{ flexShrink: 0 }}
        >
            <path d="M5 17H3v-5l2-5h14l2 5v5h-2" />
            <circle cx="7.5" cy="17" r="2" />
            <circle cx="16.5" cy="17" r="2" />
        </svg>
    );
}

function TrafficCarIcon() {
    return (
        <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            style={{ flexShrink: 0 }}
        >
            <path d="M5 17H3v-5l2-5h14l2 5v5h-2" />
            <circle cx="7.5" cy="17" r="2" />
            <circle cx="16.5" cy="17" r="2" />
            <line x1="8" y1="4.5" x2="8" y2="2.5" />
            <line x1="12" y1="4.5" x2="12" y2="2.5" />
            <line x1="16" y1="4.5" x2="16" y2="2.5" />
        </svg>
    );
}

function RailIcon() {
    return (
        <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            style={{ flexShrink: 0 }}
        >
            <rect x="4" y="3" width="16" height="13" rx="2" />
            <line x1="4" y1="10" x2="20" y2="10" />
            <line x1="12" y1="3" x2="12" y2="16" />
            <line x1="8" y1="16" x2="7" y2="19" />
            <line x1="16" y1="16" x2="17" y2="19" />
            <line x1="6" y1="19" x2="18" y2="19" />
        </svg>
    );
}

interface BarRowProps {
    icon: React.ReactNode;
    label: string;
    value: number;
    maxValue: number;
    accentColor: string;
}

function BarRow({ icon, label, value, maxValue, accentColor }: BarRowProps) {
    const pct = (value / maxValue) * 100;
    return (
        <div
            style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                marginBottom: 8,
            }}
        >
            <span
                style={{
                    color: theme.textSecondary,
                    display: "flex",
                    alignItems: "center",
                    width: 16,
                    flexShrink: 0,
                }}
            >
                {icon}
            </span>
            <span
                style={{
                    fontSize: 11,
                    color: theme.textSecondary,
                    width: 80,
                    flexShrink: 0,
                    whiteSpace: "nowrap",
                }}
            >
                {label}
            </span>
            <div
                style={{
                    flex: 1,
                    height: 8,
                    borderRadius: 4,
                    background: "rgba(148, 163, 184, 0.12)",
                    overflow: "hidden",
                }}
            >
                <div
                    style={{
                        width: `${pct}%`,
                        height: "100%",
                        borderRadius: 4,
                        background: accentColor,
                        transition: "width 0.3s ease",
                    }}
                />
            </div>
            <span
                style={{
                    fontSize: 12,
                    color: theme.textPrimary,
                    width: 42,
                    textAlign: "right",
                    flexShrink: 0,
                }}
            >
                {value} min
            </span>
        </div>
    );
}

export function RoutePanel({ route, onClose, trafficMode, metricMode, isMobile }: Props) {
    const carBase =
        trafficMode === TRAFFIC_MODE.PEAK_TRAFFIC
            ? route.carMinutesPeak
            : route.carMinutes;
    const delta = route.transitMinutes - carBase;
    const trafficDelay = route.carMinutesPeak - route.carMinutes;
    const trafficLabel =
        trafficMode === TRAFFIC_MODE.PEAK_TRAFFIC
            ? "peak traffic"
            : "no traffic";
    const deltaLabel =
        delta > 0
            ? `+${delta} min vs ${trafficLabel}`
            : delta < 0
              ? `${Math.abs(delta)} min faster than ${trafficLabel}`
              : `Same as ${trafficLabel}`;

    const [r, g, b] = getRouteRgb(route, trafficMode, metricMode);
    const accentBg = `linear-gradient(to bottom, rgba(${r},${g},${b},0.18) 0%, rgba(${r},${g},${b},0.04) 200px, transparent 100%)`;
    const barAccent = `rgb(${r},${g},${b})`;

    const maxVal = Math.max(
        route.carMinutes,
        route.carMinutesPeak,
        route.transitMinutes,
    );

    return (
        <div
            style={{
                width: isMobile ? "100%" : 340,
                height: "100%",
                background: `${theme.bgDark} ${accentBg}`,
                backgroundImage: accentBg,
                backgroundColor: theme.bgDark,
                borderLeft: isMobile ? "none" : "1px solid rgba(148, 163, 184, 0.15)",
                borderTop: isMobile ? "1px solid rgba(148, 163, 184, 0.15)" : "none",
                display: "flex",
                flexDirection: "column",
                overflowY: "auto",
                flexShrink: 0,
            }}
        >
            <div
                style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "flex-start",
                    padding: "20px 20px 0",
                }}
            >
                <div style={{ flex: 1, minWidth: 0 }}>
                    <h3
                        style={{
                            margin: "0 0 4px 0",
                            fontSize: 16,
                            fontWeight: 600,
                            color: ui.panel.titleText,
                            lineHeight: 1.3,
                        }}
                    >
                        {route.name}
                    </h3>
                    <p
                        style={{
                            margin: 0,
                            fontSize: 12,
                            color: theme.textSecondary,
                            lineHeight: 1.4,
                        }}
                    >
                        {route.description}
                    </p>
                </div>
                <button
                    onClick={onClose}
                    style={{
                        background: "none",
                        border: "none",
                        color: theme.textSecondary,
                        cursor: "pointer",
                        padding: "2px 4px",
                        marginLeft: 12,
                        fontSize: 18,
                        lineHeight: 1,
                        flexShrink: 0,
                    }}
                    title="Close"
                >
                    ×
                </button>
            </div>

            <div
                style={{
                    margin: "16px 20px 0",
                    borderTop: ui.panel.borderSoft,
                }}
            />

            {/* Bar chart */}
            <div style={{ padding: "16px 20px 0" }}>
                <BarRow
                    icon={<CarIcon />}
                    label="No traffic"
                    value={route.carMinutes}
                    maxValue={maxVal}
                    accentColor={theme.textDim}
                />
                <BarRow
                    icon={<TrafficCarIcon />}
                    label="Peak traffic"
                    value={route.carMinutesPeak}
                    maxValue={maxVal}
                    accentColor={theme.textSecondary}
                />
                <BarRow
                    icon={<RailIcon />}
                    label="Public transit"
                    value={route.transitMinutes}
                    maxValue={maxVal}
                    accentColor={barAccent}
                />
            </div>

            <div
                style={{
                    margin: "12px 20px 0",
                    borderTop: ui.panel.borderSofter,
                }}
            />

            {/* Stats */}
            <div style={{ padding: "12px 20px 0" }}>
                <div
                    style={{
                        display: "grid",
                        gridTemplateColumns: "1fr 1fr",
                        gap: "8px 12px",
                        marginBottom: 10,
                    }}
                >
                    <div>
                        <div
                            style={{
                                fontSize: 10,
                                color: theme.textDim,
                                textTransform: "uppercase",
                                letterSpacing: "0.05em",
                                marginBottom: 2,
                            }}
                        >
                            Daily commuters
                        </div>
                        <div
                            style={{
                                fontSize: 14,
                                color: theme.textPrimary,
                                fontWeight: 600,
                            }}
                        >
                            {route.dailyCommuters.toLocaleString()}
                        </div>
                    </div>
                    <div>
                        <div
                            style={{
                                fontSize: 10,
                                color: theme.textDim,
                                textTransform: "uppercase",
                                letterSpacing: "0.05em",
                                marginBottom: 2,
                            }}
                        >
                            Peak hours
                        </div>
                        <div style={{ fontSize: 12, color: theme.textPrimary }}>
                            {route.peakHours}
                        </div>
                    </div>
                    <div>
                        <div
                            style={{
                                fontSize: 10,
                                color: theme.textDim,
                                textTransform: "uppercase",
                                letterSpacing: "0.05em",
                                marginBottom: 2,
                            }}
                        >
                            Traffic delay
                        </div>
                        <div
                            style={{
                                fontSize: 14,
                                color: ui.status.danger,
                                fontWeight: 600,
                            }}
                        >
                            +{trafficDelay} min
                        </div>
                    </div>
                    <div>
                        <div
                            style={{
                                fontSize: 10,
                                color: theme.textDim,
                                textTransform: "uppercase",
                                letterSpacing: "0.05em",
                                marginBottom: 2,
                            }}
                        >
                            vs {trafficLabel}
                        </div>
                        <div
                            style={{
                                fontSize: 13,
                                fontWeight: 600,
                                color:
                                    delta > 0
                                        ? ui.status.danger
                                        : delta < 0
                                          ? ui.status.success
                                          : theme.textSecondary,
                            }}
                        >
                            {deltaLabel}
                        </div>
                    </div>
                </div>

                <div
                    style={{
                        display: "flex",
                        gap: 6,
                        flexWrap: "wrap",
                        marginTop: 4,
                    }}
                >
                    {route.transitModes.map((mode) => (
                        <span
                            key={mode}
                            style={{
                                fontSize: 11,
                                background: ui.chips.background,
                                color: ui.chips.text,
                                padding: "2px 8px",
                                borderRadius: 12,
                            }}
                        >
                            {mode}
                        </span>
                    ))}
                </div>
            </div>

            <DelayReasonTags route={route} />
        </div>
    );
}

import { METRIC_MODE, TRAFFIC_MODE } from "../types";
import type { Route, TrafficMode, MetricMode } from "../types";
import { theme, transitReasonThresholds } from "../constants";
import { getRouteRgb, getRouteMetricValue } from "../utils/routeColor";

const LABELS = {
    header: {
        allRoutes: (n: number) => `All ${n} routes`,
        highlighted: (n: number) => `${n} highlighted routes`,
    },
    metric: {
        commuters: (n: number) =>
            n >= 1000 ? `~${Math.round(n / 100) / 10}k/day` : `~${n}/day`,
        ratio: (v: number) => `${v.toFixed(2)}×`,
        personMinutes: (v: number) => {
            if (v <= 0) return "saves time";
            const k = v / 1000;
            return k >= 10 ? `~${Math.round(k)}k min/day` : `~${k.toFixed(1)}k min/day`;
        },
    },
    delayReason: {
        longWait: (n: number) => `${n} min wait`,
        transfer: (n: number) => (n === 1 ? "1 transfer" : `${n} transfers`),
        walking: (n: number) => `${n} min walk`,
        none: "No delay",
    },
} as const;

const REASON_COLORS = {
    transfer: "#f59e0b",
    longWait: "#f97316",
    walking: "#38bdf8",
} as const;

function DelayReasonLabel({ route }: { route: Route }) {
    const { longWaitMinutes, longWalkMinutes, walkingSlowThresholdMinutes } = transitReasonThresholds;
    const reasons: { label: string; color: string }[] = [];

    if (route.transitMaxWaitMinutes >= longWaitMinutes)
        reasons.push({ label: LABELS.delayReason.longWait(route.transitMaxWaitMinutes), color: REASON_COLORS.longWait });
    if (route.transitTransfers >= 1)
        reasons.push({ label: LABELS.delayReason.transfer(route.transitTransfers), color: REASON_COLORS.transfer });
    if (
        route.transitWalkMinutes >= longWalkMinutes &&
        route.transitMinutes - route.carMinutesPeak > walkingSlowThresholdMinutes
    )
        reasons.push({ label: LABELS.delayReason.walking(route.transitWalkMinutes), color: REASON_COLORS.walking });

    if (reasons.length === 0)
        return <span style={{ fontSize: 11, color: theme.textDim }}>{LABELS.delayReason.none}</span>;

    return (
        <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 2 }}>
            {reasons.map(({ label, color }) => (
                <span key={label} style={{ fontSize: 11, fontWeight: 600, color }}>{label}</span>
            ))}
        </div>
    );
}

interface Props {
    routes: Route[];
    trafficMode: TrafficMode;
    metricMode: MetricMode;
    isFullRange: boolean;
    onRouteSelect: (id: number) => void;
    isMobile?: boolean;
}

function RouteRow({
    route,
    trafficMode,
    metricMode,
    onSelect,
}: {
    route: Route;
    trafficMode: TrafficMode;
    metricMode: MetricMode;
    onSelect: () => void;
}) {
    const [r, g, b] = getRouteRgb(route, trafficMode, metricMode);
    const accentColor = `rgb(${r},${g},${b})`;
    const metricValue = getRouteMetricValue(route, trafficMode, metricMode);
    const metricLabel =
        metricMode === METRIC_MODE.TRAVEL_TIME_DIFFERENCE
            ? LABELS.metric.ratio(metricValue)
            : LABELS.metric.personMinutes(metricValue);
    const isPeak = trafficMode === TRAFFIC_MODE.PEAK_TRAFFIC;
    const carMinutes = isPeak ? route.carMinutesPeak : route.carMinutes;
    const timeDelta = route.transitMinutes - carMinutes;
    const timeDeltaLabel =
        timeDelta > 0
            ? `+${timeDelta} min`
            : timeDelta < 0
              ? `${timeDelta} min`
              : "same";

    return (
        <button
            onClick={onSelect}
            style={{
                width: "100%",
                display: "flex",
                alignItems: "flex-start",
                gap: 10,
                padding: "10px 16px",
                background: "none",
                border: "none",
                borderBottom: "1px solid rgba(148,163,184,0.08)",
                cursor: "pointer",
                textAlign: "left",
                color: theme.textPrimary,
            }}
        >
            <div
                style={{
                    width: 4,
                    alignSelf: "stretch",
                    borderRadius: 2,
                    background: accentColor,
                    flexShrink: 0,
                    marginTop: 2,
                }}
            />
            <div style={{ flex: 1, minWidth: 0 }}>
                <div
                    style={{
                        fontSize: 13,
                        fontWeight: 600,
                        color: theme.textBright,
                        whiteSpace: "nowrap",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                    }}
                >
                    {route.name}
                </div>
                <div
                    style={{
                        fontSize: 11,
                        color: theme.textSecondary,
                        marginTop: 2,
                        whiteSpace: "nowrap",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                    }}
                >
                    {route.description}
                </div>
            </div>
            <div
                style={{
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "flex-end",
                    flexShrink: 0,
                    gap: 2,
                }}
            >
                {metricMode === METRIC_MODE.DELAY_REASON ? (
                    <DelayReasonLabel route={route} />
                ) : (
                    <span style={{ fontSize: 12, fontWeight: 600, color: accentColor }}>
                        {metricLabel}
                    </span>
                )}
                <span style={{ fontSize: 11, color: theme.textDim }}>
                    {timeDeltaLabel}
                </span>
            </div>
        </button>
    );
}

export function FilteredRoutesPanel({
    routes,
    trafficMode,
    metricMode,
    isFullRange,
    onRouteSelect,
    isMobile,
}: Props) {
    const headerLabel = isFullRange
        ? LABELS.header.allRoutes(routes.length)
        : LABELS.header.highlighted(routes.length);

    return (
        <div
            style={{
                width: isMobile ? "100%" : 340,
                height: "100%",
                backgroundColor: theme.bgDark,
                borderLeft: isMobile ? "none" : "1px solid rgba(148, 163, 184, 0.15)",
                borderTop: isMobile ? "1px solid rgba(148, 163, 184, 0.15)" : "none",
                display: "flex",
                flexDirection: "column",
                flexShrink: 0,
            }}
        >
            <div
                style={{
                    padding: "14px 16px 10px",
                    borderBottom: "1px solid rgba(148,163,184,0.12)",
                    flexShrink: 0,
                }}
            >
                <div
                    style={{
                        fontSize: 12,
                        fontWeight: 600,
                        color: theme.textPrimary,
                    }}
                >
                    {headerLabel}
                </div>
                <div
                    style={{
                        fontSize: 11,
                        color: theme.textDim,
                        marginTop: 3,
                    }}
                >
                    Sorted worst transit first. Click a route for details.
                </div>
            </div>
            <div style={{ overflowY: "auto", flex: 1 }}>
                {routes.map((route) => (
                    <RouteRow
                        key={route.id}
                        route={route}
                        trafficMode={trafficMode}
                        metricMode={metricMode}
                        onSelect={() => onRouteSelect(route.id)}
                    />
                ))}
            </div>
        </div>
    );
}

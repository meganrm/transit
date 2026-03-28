import type { NeighborhoodDetail } from "../data/analytics";
import type { Route } from "../types";
import { theme } from "../constants";
import { getRouteColor, getRouteRgb } from "../utils/routeColor";

interface Props {
    detail: NeighborhoodDetail;
    onClose: () => void;
    onRouteSelect: (id: number) => void;
}

function scoreLabel(avgRatio: number): string {
    if (avgRatio < 0.9)  return "faster than driving";
    if (avgRatio < 1.1)  return "about the same as driving";
    if (avgRatio < 1.75) return "somewhat slower than driving";
    if (avgRatio < 2.5)  return "slower than driving";
    if (avgRatio < 4.0)  return "much slower than driving";
    return "significantly slower than driving";
}

function RouteRow({
    route,
    maxRatio,
    label,
    onRouteSelect,
}: {
    route: Route;
    maxRatio: number;
    label: string;
    onRouteSelect: (id: number) => void;
}) {
    const ratio = route.transitMinutes / route.carMinutesPeak;
    const routeColor = getRouteColor(route);
    return (
        <button
            onClick={() => onRouteSelect(route.id)}
            style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                width: "100%",
                background: "none",
                border: "none",
                cursor: "pointer",
                padding: "6px 8px",
                borderRadius: 6,
                marginBottom: 2,
                textAlign: "left",
            }}
            onMouseEnter={(e) =>
                (e.currentTarget.style.background = "rgba(148,163,184,0.07)")
            }
            onMouseLeave={(e) => (e.currentTarget.style.background = "none")}
        >
            <span
                style={{
                    flex: 1,
                    fontSize: 12,
                    color: theme.textPrimary,
                    whiteSpace: "nowrap",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                }}
            >
                {label}
            </span>
            <div
                style={{
                    width: 48,
                    height: 5,
                    borderRadius: 2,
                    background: "rgba(148,163,184,0.12)",
                    overflow: "hidden",
                    flexShrink: 0,
                }}
            >
                <div
                    style={{
                        width: `${Math.min(100, (ratio / maxRatio) * 100)}%`,
                        height: "100%",
                        borderRadius: 2,
                        background: routeColor,
                    }}
                />
            </div>
            <span
                style={{
                    fontSize: 11,
                    color: routeColor,
                    fontWeight: 600,
                    width: 36,
                    textAlign: "right",
                    flexShrink: 0,
                    fontVariantNumeric: "tabular-nums",
                }}
            >
                {ratio.toFixed(2)}×
            </span>
        </button>
    );
}

export function NeighborhoodPanel({ detail, onClose, onRouteSelect }: Props) {
    const [r, g, b] = getRouteRgb({
        transitMinutes: detail.avgRatio * 100,
        carMinutesPeak: 100,
    });
    const accentColor = `rgb(${r},${g},${b})`;
    const accentBg = `linear-gradient(to bottom, rgba(${r},${g},${b},0.18) 0%, rgba(${r},${g},${b},0.04) 200px, transparent 100%)`;

    const allRoutes = [...detail.fromRoutes, ...detail.toRoutes];
    const maxRatio = Math.max(
        ...allRoutes.map((r) => r.transitMinutes / r.carMinutesPeak),
        1,
    );

    const sortedFrom = [...detail.fromRoutes].sort(
        (a, b) => a.transitMinutes / a.carMinutesPeak - b.transitMinutes / b.carMinutesPeak,
    );
    const sortedTo = [...detail.toRoutes].sort(
        (a, b) => a.transitMinutes / a.carMinutesPeak - b.transitMinutes / b.carMinutesPeak,
    );

    return (
        <div
            style={{
                width: 340,
                height: "100%",
                backgroundColor: theme.bgDark,
                backgroundImage: accentBg,
                borderLeft: "1px solid rgba(148, 163, 184, 0.15)",
                display: "flex",
                flexDirection: "column",
                overflowY: "auto",
                flexShrink: 0,
            }}
        >
            {/* Header */}
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
                            color: "#f1f5f9",
                            lineHeight: 1.3,
                        }}
                    >
                        {detail.neighborhood}
                    </h3>
                    <p
                        style={{ margin: 0, fontSize: 12, color: theme.textSecondary }}
                    >
                        Seattle neighborhood
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
                    borderTop: "1px solid rgba(148, 163, 184, 0.1)",
                }}
            />

            {/* Transit score */}
            <div style={{ padding: "14px 20px 0" }}>
                <div
                    style={{
                        fontSize: 10,
                        color: theme.textDim,
                        textTransform: "uppercase",
                        letterSpacing: "0.07em",
                        marginBottom: 8,
                    }}
                >
                    Transit Score
                </div>
                <div
                    style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 12,
                        marginBottom: 6,
                    }}
                >
                    <div
                        style={{
                            fontSize: 32,
                            fontWeight: 700,
                            color: accentColor,
                            lineHeight: 1,
                            fontVariantNumeric: "tabular-nums",
                        }}
                    >
                        {detail.avgRatio.toFixed(2)}×
                    </div>
                    <div style={{ fontSize: 13, color: accentColor }}>
                        {scoreLabel(detail.avgRatio)}
                    </div>
                </div>
                <div
                    style={{
                        height: 6,
                        borderRadius: 3,
                        background: "rgba(148, 163, 184, 0.12)",
                        overflow: "hidden",
                        marginBottom: 4,
                    }}
                >
                    <div
                        style={{
                            width: `${Math.min(100, ((detail.avgRatio - 0.4) / (1.8 - 0.4)) * 100)}%`,
                            height: "100%",
                            borderRadius: 3,
                            background: accentColor,
                        }}
                    />
                </div>
                <div
                    style={{
                        display: "flex",
                        justifyContent: "space-between",
                        fontSize: 10,
                        color: theme.textDim,
                    }}
                >
                    <span style={{ color: "#4d9221" }}>Faster</span>
                    <span>Equal</span>
                    <span style={{ color: "#c51b7d" }}>Slower</span>
                </div>
            </div>

            <div
                style={{
                    margin: "14px 20px 0",
                    borderTop: "1px solid rgba(148, 163, 184, 0.08)",
                }}
            />

            {/* Stats grid */}
            <div style={{ padding: "12px 20px 0" }}>
                <div
                    style={{
                        display: "grid",
                        gridTemplateColumns: "1fr 1fr",
                        gap: "8px 12px",
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
                            {detail.totalCommuters.toLocaleString()}
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
                            Person-min lost/day
                        </div>
                        <div
                            style={{
                                fontSize: 14,
                                fontWeight: 600,
                                color:
                                    detail.totalPersonMinutesLost > 0
                                        ? "#f87171"
                                        : "#4ade80",
                            }}
                        >
                            {detail.totalPersonMinutesLost > 0 ? "+" : ""}
                            {detail.totalPersonMinutesLost.toLocaleString()}
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
                            Routes tracked
                        </div>
                        <div
                            style={{
                                fontSize: 14,
                                color: theme.textPrimary,
                                fontWeight: 600,
                            }}
                        >
                            {allRoutes.length}
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
                            Avg min lost/commuter
                        </div>
                        <div
                            style={{
                                fontSize: 14,
                                fontWeight: 600,
                                color:
                                    detail.totalPersonMinutesLost > 0
                                        ? "#f87171"
                                        : "#4ade80",
                            }}
                        >
                            {detail.totalPersonMinutesLost > 0 ? "+" : ""}
                            {(
                                detail.totalPersonMinutesLost /
                                detail.totalCommuters
                            ).toFixed(1)}{" "}
                            min
                        </div>
                    </div>
                </div>
            </div>

            <div
                style={{
                    margin: "14px 20px 0",
                    borderTop: "1px solid rgba(148, 163, 184, 0.08)",
                }}
            />

            {/* Route list */}
            <div style={{ padding: "12px 20px 16px" }}>
                {sortedFrom.length > 0 && (
                    <>
                        <div
                            style={{
                                fontSize: 10,
                                color: theme.textDim,
                                textTransform: "uppercase",
                                letterSpacing: "0.07em",
                                marginBottom: 6,
                            }}
                        >
                            From here
                        </div>
                        {sortedFrom.map((route) => {
                            const dest = route.name.split(" → ")[1]?.trim() ?? "";
                            return (
                                <RouteRow
                                    key={route.id}
                                    route={route}
                                    maxRatio={maxRatio}
                                    label={`→ ${dest}`}
                                    onRouteSelect={onRouteSelect}
                                />
                            );
                        })}
                    </>
                )}
                {sortedTo.length > 0 && (
                    <>
                        <div
                            style={{
                                fontSize: 10,
                                color: theme.textDim,
                                textTransform: "uppercase",
                                letterSpacing: "0.07em",
                                marginTop: sortedFrom.length > 0 ? 10 : 0,
                                marginBottom: 6,
                            }}
                        >
                            To here
                        </div>
                        {sortedTo.map((route) => {
                            const origin = route.name.split(" → ")[0]?.trim() ?? "";
                            return (
                                <RouteRow
                                    key={route.id}
                                    route={route}
                                    maxRatio={maxRatio}
                                    label={`← ${origin}`}
                                    onRouteSelect={onRouteSelect}
                                />
                            );
                        })}
                    </>
                )}
            </div>
        </div>
    );
}

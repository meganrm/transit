import { weightScale, theme } from "../constants";
import { buildLegendGradient, getLegendEqualPct } from "../utils/routeColor";

const GRADIENT = buildLegendGradient();
const EQUAL_PCT = getLegendEqualPct();

const thicknessItems = [
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

export function Legend() {
    return (
        <div
            style={{
                position: "absolute",
                bottom: 24,
                left: 12,
                background: theme.bgOverlay,
                color: theme.textPrimary,
                borderRadius: 8,
                padding: "12px 16px",
                boxShadow: "0 2px 12px rgba(0,0,0,0.4)",
                zIndex: 1000,
                fontSize: 13,
            }}
        >
            <strong style={{ display: "block", marginBottom: 8 }}>
                Transit vs Peak Traffic
            </strong>
            <div style={{ position: "relative", width: 160, marginBottom: 16 }}>
                <div
                    style={{
                        width: 160,
                        height: 6,
                        borderRadius: 3,
                        background: GRADIENT,
                        marginBottom: 4,
                    }}
                />
                {/* Tick at ratio 1.0 (equal), position derived from data range */}
                <div
                    style={{
                        position: "absolute",
                        left: EQUAL_PCT,
                        top: 0,
                        width: 1,
                        height: 10,
                        background: theme.textSecondary,
                        transform: "translateX(-50%)",
                    }}
                />
                <div
                    style={{
                        display: "flex",
                        justifyContent: "space-between",
                        fontSize: 11,
                        color: theme.textSecondary,
                        marginTop: 8,
                    }}
                >
                    <span style={{ color: "#4d9221" }}>Faster</span>
                    <span
                        style={{
                            position: "absolute",
                            left: EQUAL_PCT,
                            transform: "translateX(-50%)",
                            color: theme.textSecondary,
                            whiteSpace: "nowrap",
                        }}
                    >
                        equal
                    </span>
                    <span style={{ color: "#c51b7d" }}>Slower</span>
                </div>
            </div>
            <strong
                style={{ display: "block", marginTop: 10, marginBottom: 6 }}
            >
                Daily Commuters
            </strong>
            {thicknessItems.map((item) => (
                <div
                    key={item.label}
                    style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 8,
                        marginBottom: 3,
                    }}
                >
                    <span
                        style={{
                            width: 24,
                            height: item.weight,
                            borderRadius: item.weight / 2,
                            background: theme.textSecondary,
                            display: "inline-block",
                        }}
                    />
                    <span>{item.label}</span>
                </div>
            ))}
        </div>
    );
}

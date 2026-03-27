import { routeColors, weightScale, theme } from "../constants";

const items = [
    { color: routeColors.green, label: "Transit faster or equal" },
    { color: routeColors.yellow, label: "Transit up to 50% slower" },
    { color: routeColors.red, label: "Transit >50% slower" },
];

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
            <strong style={{ display: "block", marginBottom: 6 }}>
                Transit vs Car
            </strong>
            {items.map((item) => (
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
                            height: 4,
                            borderRadius: 2,
                            background: item.color,
                            display: "inline-block",
                        }}
                    />
                    <span>{item.label}</span>
                </div>
            ))}
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

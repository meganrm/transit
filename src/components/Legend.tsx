const items = [
    { color: "#22c55e", label: "Transit faster or equal" },
    { color: "#eab308", label: "Transit up to 50% slower" },
    { color: "#ef4444", label: "Transit >50% slower" },
];

const thicknessItems = [
    { weight: 2, label: "~4k/day" },
    { weight: 5, label: "~12k/day" },
    { weight: 8, label: "~22k/day" },
];

export function Legend() {
    return (
        <div
            style={{
                position: "absolute",
                bottom: 24,
                left: 12,
                background: "rgba(15, 23, 42, 0.92)",
                color: "#e2e8f0",
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
                            background: "#94a3b8",
                            display: "inline-block",
                        }}
                    />
                    <span>{item.label}</span>
                </div>
            ))}
        </div>
    );
}

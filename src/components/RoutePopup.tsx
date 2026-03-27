import {
    Chart as ChartJS,
    CategoryScale,
    LinearScale,
    BarElement,
    Title,
    Tooltip,
    Legend,
} from "chart.js";
import type { ChartOptions } from "chart.js";
import { Bar } from "react-chartjs-2";
import type { Route } from "../types";

ChartJS.register(
    CategoryScale,
    LinearScale,
    BarElement,
    Title,
    Tooltip,
    Legend,
);

interface Props {
    route: Route;
}

export function RoutePopup({ route }: Props) {
    const delta = route.transitMinutes - route.carMinutes;
    const deltaLabel =
        delta > 0
            ? `+${delta} min by transit`
            : delta < 0
              ? `${delta} min by transit (faster!)`
              : "Same time";

    const data = {
        labels: ["Car", "Transit"],
        datasets: [
            {
                data: [route.carMinutes, route.transitMinutes],
                backgroundColor: ["#3b82f6", "#f97316"],
                borderRadius: 4,
            },
        ],
    };

    const options: ChartOptions<"bar"> = {
        indexAxis: "y" as const,
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
            legend: { display: false },
            tooltip: {
                callbacks: {
                    label: (ctx) => `${ctx.parsed.x ?? 0} min`,
                },
            },
        },
        scales: {
            x: {
                beginAtZero: true,
                title: { display: true, text: "Minutes" },
            },
        },
    };

    return (
        <div style={{ minWidth: 260 }}>
            <h3 style={{ margin: "0 0 4px 0", fontSize: 15 }}>{route.name}</h3>
            <p style={{ margin: "0 0 8px 0", fontSize: 12, color: "#666" }}>
                {route.description}
            </p>
            <div style={{ height: 90 }}>
                <Bar data={data} options={options} />
            </div>
            <p
                style={{
                    margin: "8px 0 4px 0",
                    fontSize: 13,
                    fontWeight: 600,
                    color:
                        delta > 0 ? "#ef4444" : delta < 0 ? "#22c55e" : "#666",
                }}
            >
                {deltaLabel}
            </p>
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                {route.transitModes.map((mode) => (
                    <span
                        key={mode}
                        style={{
                            fontSize: 11,
                            background: "#e0e7ff",
                            color: "#3730a3",
                            padding: "2px 8px",
                            borderRadius: 12,
                        }}
                    >
                        {mode}
                    </span>
                ))}
            </div>
        </div>
    );
}

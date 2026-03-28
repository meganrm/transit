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
import { theme, ui } from "../constants";

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
                title: {
                    display: true,
                    text: "Minutes",
                    color: theme.textSecondary,
                },
                ticks: { color: theme.textSecondary },
                grid: { color: "rgba(148, 163, 184, 0.15)" },
            },
            y: {
                ticks: { color: theme.textPrimary },
                grid: { display: false },
            },
        },
    };

    return (
        <div style={{ minWidth: 260, color: theme.textPrimary }}>
            <h3
                style={{
                    margin: "0 0 4px 0",
                    fontSize: 15,
                    color: ui.panel.titleText,
                }}
            >
                {route.name}
            </h3>
            <p
                style={{
                    margin: "0 0 8px 0",
                    fontSize: 12,
                    color: theme.textSecondary,
                }}
            >
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
                        delta > 0
                            ? ui.status.danger
                            : delta < 0
                              ? ui.status.success
                              : theme.textSecondary,
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
    );
}

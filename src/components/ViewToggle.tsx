import { theme } from "../constants";

export type ViewMode = "all" | "routes" | "neighborhoods";

const MODES: { value: ViewMode; label: string }[] = [
    { value: "all", label: "All Routes" },
    { value: "routes", label: "Underserved Routes" },
    { value: "neighborhoods", label: "Underserved Areas" },
];

interface Props {
    viewMode: ViewMode;
    onChange: (mode: ViewMode) => void;
}

export function ViewToggle({ viewMode, onChange }: Props) {
    return (
        <div
            style={{
                position: "absolute",
                top: 12,
                right: 12,
                zIndex: 1000,
                display: "flex",
                background: theme.bgOverlay,
                borderRadius: 8,
                padding: 3,
                gap: 2,
                boxShadow: "0 2px 12px rgba(0,0,0,0.4)",
            }}
        >
            {MODES.map((mode) => {
                const active = viewMode === mode.value;
                return (
                    <button
                        key={mode.value}
                        onClick={() => onChange(mode.value)}
                        style={{
                            background: active
                                ? "rgba(165, 180, 252, 0.2)"
                                : "none",
                            border: "none",
                            borderRadius: 6,
                            color: active ? "#a5b4fc" : theme.textSecondary,
                            cursor: "pointer",
                            fontSize: 12,
                            fontWeight: active ? 600 : 400,
                            padding: "5px 10px",
                            transition: "all 0.15s",
                            whiteSpace: "nowrap",
                        }}
                    >
                        {mode.label}
                    </button>
                );
            })}
        </div>
    );
}

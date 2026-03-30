import { theme } from "../constants";

const DIM_BG = "rgba(10, 15, 30, 0.72)";

interface RangeSliderProps {
    gradient: string;
    valueMin: number;
    valueMax: number;
    onMinChange: (v: number) => void;
    onMaxChange: (v: number) => void;
    /** Show the full gradient statically across the track, dimming inactive ends */
    staticGradient?: boolean;
    labelMin?: string;
    labelMax?: string;
}

export function RangeSlider({
    gradient,
    valueMin,
    valueMax,
    onMinChange,
    onMaxChange,
    staticGradient = false,
    labelMin,
    labelMax,
}: RangeSliderProps) {
    const hasLabels = labelMin !== undefined || labelMax !== undefined;

    return (
        <div
            style={{
                position: "relative",
                paddingTop: hasLabels ? 18 : 0,
                marginBottom: 6,
            }}
        >
            {labelMin !== undefined && (
                <div
                    style={{
                        position: "absolute",
                        top: 0,
                        left: `${valueMin}%`,
                        transform: "translateX(-50%)",
                        fontSize: 10,
                        color: theme.textSecondary,
                        pointerEvents: "none",
                        whiteSpace: "nowrap",
                    }}
                >
                    {labelMin}
                </div>
            )}
            {labelMax !== undefined && (
                <div
                    style={{
                        position: "absolute",
                        top: 0,
                        left: `${valueMax}%`,
                        transform: "translateX(-50%)",
                        fontSize: 10,
                        color: theme.textSecondary,
                        pointerEvents: "none",
                        whiteSpace: "nowrap",
                    }}
                >
                    {labelMax}
                </div>
            )}
            <div className="range-slider-track">
                {staticGradient ? (
                    <>
                        <div style={{ position: "absolute", left: 0, right: 0, height: 6, borderRadius: 3, background: gradient }} />
                        {valueMin > 0 && (
                            <div style={{ position: "absolute", left: 0, width: `${valueMin}%`, height: 6, borderRadius: "3px 0 0 3px", background: DIM_BG }} />
                        )}
                        {valueMax < 100 && (
                            <div style={{ position: "absolute", left: `${valueMax}%`, right: 0, height: 6, borderRadius: "0 3px 3px 0", background: DIM_BG }} />
                        )}
                    </>
                ) : (
                    <>
                        <div className="range-slider-bg" />
                        <div
                            style={{
                                position: "absolute",
                                height: 6,
                                borderRadius: 3,
                                left: `${valueMin}%`,
                                width: `${valueMax - valueMin}%`,
                                background: gradient,
                            }}
                        />
                    </>
                )}
                <input
                    type="range"
                    min={0}
                    max={100}
                    value={valueMin}
                    className="range-slider-input"
                    onChange={(e) => {
                        const v = Number(e.target.value);
                        if (v < valueMax) onMinChange(v);
                    }}
                />
                <input
                    type="range"
                    min={0}
                    max={100}
                    value={valueMax}
                    className="range-slider-input"
                    onChange={(e) => {
                        const v = Number(e.target.value);
                        if (v > valueMin) onMaxChange(v);
                    }}
                />
            </div>
        </div>
    );
}

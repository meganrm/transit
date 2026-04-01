import { useState } from "react";
import { GITHUB_REPO_URL, theme, ui } from "../constants";

const TEXT = {
    appName: "Transit Gap",
    aboutButton: "About",
    feedbackButton: "Feedback",
    aboutTitle: "About Transit Gap",
    aboutBody1:
        "Transit Gap highlights areas and routes that are currently underserved by transit. By comparing commute routes and transit travel time to peak-hour driving, we can identify gaps in service. The 150 most common routes were chosen using LODES data from 2021, and combined into neighborhood groups for overall commuters per day. Unfortunately, this is the most recent data available and obviously has limitations due to the pandemic, but it still gives a broad overview of where people are commuting in Seattle. ",
    aboutBody2:
        "Routes are color-coded by how much longer transit takes — green routes are competitive with driving; pink routes show the largest time gap. Use the filters in the legend to explore by commuter volume, route distance, or delay reason (long waits, transfers, or walking).",
    aboutAttribution:
        "Data: King County Metro GTFS · Google Distance Matrix API",
    closeButton: "✕",
    feedbackTitle: "Send Feedback",
    bugLabel: "Bug Report",
    featureLabel: "Feature Request",
    titleLabel: "Title",
    titlePlaceholder: "Brief summary",
    descriptionLabel: "Description",
    descriptionPlaceholder:
        "Steps to reproduce / what you expected vs what happened",
    featurePlaceholder: "Describe the feature and why it would be useful",
    submitLabel: "Open on GitHub",
    cancelLabel: "Cancel",
} as const;

const enum FEEDBACK_TYPE {
    BUG = "bug",
    FEATURE = "enhancement",
}

const modalStyle: React.CSSProperties = {
    position: "fixed",
    inset: 0,
    zIndex: 2000,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    background: "rgba(0,0,0,0.5)",
};

const modalPanelStyle: React.CSSProperties = {
    background: theme.bgOverlay,
    border: ui.panel.borderRegular,
    borderRadius: 8,
    boxShadow: "0 2px 12px rgba(0,0,0,0.4)",
    padding: "20px 24px",
    display: "flex",
    flexDirection: "column",
    gap: 16,
};

const ghostButtonStyle: React.CSSProperties = {
    background: "transparent",
    border: "none",
    color: theme.textSecondary,
    fontSize: 12,
    cursor: "pointer",
    padding: "2px 0",
    letterSpacing: "0.04em",
};

export function AppHeader() {
    const [aboutOpen, setAboutOpen] = useState(false);
    const [feedbackOpen, setFeedbackOpen] = useState(false);
    const [feedbackType, setFeedbackType] = useState<FEEDBACK_TYPE>(
        FEEDBACK_TYPE.BUG,
    );
    const [title, setTitle] = useState("");
    const [body, setBody] = useState("");

    const handleFeedbackSubmit = () => {
        const params = new URLSearchParams({
            title,
            body,
            labels: feedbackType,
        });
        window.open(
            `${GITHUB_REPO_URL}/issues/new?${params.toString()}`,
            "_blank",
        );
        setFeedbackOpen(false);
        setTitle("");
        setBody("");
        setFeedbackType(FEEDBACK_TYPE.BUG);
    };

    const handleFeedbackClose = () => {
        setFeedbackOpen(false);
        setTitle("");
        setBody("");
        setFeedbackType(FEEDBACK_TYPE.BUG);
    };

    return (
        <>
            <div
                style={{
                    position: "absolute",
                    top: 12,
                    left: 12,
                    zIndex: 500,
                    display: "flex",
                    alignItems: "center",
                    gap: 20,
                    background: theme.bgOverlay,
                    border: ui.panel.borderRegular,
                    borderRadius: 8,
                    padding: "9px 16px",
                    boxShadow: "0 2px 12px rgba(0,0,0,0.4)",
                    backdropFilter: "blur(4px)",
                }}
            >
                <span
                    style={{
                        fontFamily: "'Syne', sans-serif",
                        fontWeight: 800,
                        fontSize: 14,
                        letterSpacing: "0.14em",
                        textTransform: "uppercase",
                        color: theme.textBright,
                        userSelect: "none",
                    }}
                >
                    {TEXT.appName}
                </span>
                <div
                    style={{
                        width: 1,
                        height: 14,
                        background: "rgba(148, 163, 184, 0.2)",
                    }}
                />
                <button
                    style={ghostButtonStyle}
                    onClick={() => setAboutOpen(true)}
                >
                    {TEXT.aboutButton}
                </button>
                <button
                    style={ghostButtonStyle}
                    onClick={() => setFeedbackOpen(true)}
                >
                    {TEXT.feedbackButton}
                </button>
            </div>

            {aboutOpen && (
                <div style={modalStyle} onClick={() => setAboutOpen(false)}>
                    <div
                        style={{ ...modalPanelStyle, width: 420 }}
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div
                            style={{
                                display: "flex",
                                justifyContent: "space-between",
                                alignItems: "center",
                            }}
                        >
                            <span
                                style={{
                                    fontFamily: "'Syne', sans-serif",
                                    fontWeight: 700,
                                    fontSize: 14,
                                    letterSpacing: "0.08em",
                                    textTransform: "uppercase",
                                    color: theme.textBright,
                                }}
                            >
                                {TEXT.aboutTitle}
                            </span>
                            <button
                                onClick={() => setAboutOpen(false)}
                                style={{
                                    ...ghostButtonStyle,
                                    fontSize: 14,
                                    color: theme.textSecondary,
                                }}
                            >
                                {TEXT.closeButton}
                            </button>
                        </div>
                        <p
                            style={{
                                margin: 0,
                                fontSize: 13,
                                lineHeight: 1.6,
                                color: theme.textPrimary,
                            }}
                        >
                            {TEXT.aboutBody1}
                        </p>
                        <p
                            style={{
                                margin: 0,
                                fontSize: 13,
                                lineHeight: 1.6,
                                color: theme.textPrimary,
                            }}
                        >
                            {TEXT.aboutBody2}
                        </p>
                        <p
                            style={{
                                margin: 0,
                                fontSize: 11,
                                color: theme.textSecondary,
                                borderTop: ui.panel.borderSoft,
                                paddingTop: 12,
                            }}
                        >
                            {TEXT.aboutAttribution}
                        </p>
                    </div>
                </div>
            )}

            {feedbackOpen && (
                <div style={modalStyle} onClick={handleFeedbackClose}>
                    <div
                        style={{ ...modalPanelStyle, width: 380 }}
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div
                            style={{
                                fontSize: 15,
                                fontWeight: 600,
                                color: theme.textBright,
                            }}
                        >
                            {TEXT.feedbackTitle}
                        </div>
                        <div style={{ display: "flex", gap: 8 }}>
                            {(
                                [
                                    [FEEDBACK_TYPE.BUG, TEXT.bugLabel],
                                    [FEEDBACK_TYPE.FEATURE, TEXT.featureLabel],
                                ] as const
                            ).map(([type, label]) => (
                                <button
                                    key={type}
                                    onClick={() => setFeedbackType(type)}
                                    style={{
                                        flex: 1,
                                        padding: "6px 10px",
                                        borderRadius: 12,
                                        border: "1px solid",
                                        fontSize: 12,
                                        cursor: "pointer",
                                        borderColor:
                                            feedbackType === type
                                                ? "rgba(148, 163, 184, 0.5)"
                                                : "rgba(148, 163, 184, 0.15)",
                                        background:
                                            feedbackType === type
                                                ? "rgba(148, 163, 184, 0.15)"
                                                : "transparent",
                                        color:
                                            feedbackType === type
                                                ? theme.textPrimary
                                                : theme.textSecondary,
                                    }}
                                >
                                    {label}
                                </button>
                            ))}
                        </div>
                        <div
                            style={{
                                display: "flex",
                                flexDirection: "column",
                                gap: 6,
                            }}
                        >
                            <label
                                style={{
                                    fontSize: 12,
                                    color: theme.textSecondary,
                                }}
                            >
                                {TEXT.titleLabel}
                            </label>
                            <input
                                type="text"
                                value={title}
                                onChange={(e) => setTitle(e.target.value)}
                                placeholder={TEXT.titlePlaceholder}
                                style={{
                                    background: "rgba(15, 23, 42, 0.8)",
                                    border: ui.panel.borderSoft,
                                    borderRadius: 6,
                                    padding: "7px 10px",
                                    color: theme.textPrimary,
                                    fontSize: 13,
                                    outline: "none",
                                }}
                            />
                        </div>
                        <div
                            style={{
                                display: "flex",
                                flexDirection: "column",
                                gap: 6,
                            }}
                        >
                            <label
                                style={{
                                    fontSize: 12,
                                    color: theme.textSecondary,
                                }}
                            >
                                {TEXT.descriptionLabel}
                            </label>
                            <textarea
                                value={body}
                                onChange={(e) => setBody(e.target.value)}
                                placeholder={
                                    feedbackType === FEEDBACK_TYPE.BUG
                                        ? TEXT.descriptionPlaceholder
                                        : TEXT.featurePlaceholder
                                }
                                rows={4}
                                style={{
                                    background: "rgba(15, 23, 42, 0.8)",
                                    border: ui.panel.borderSoft,
                                    borderRadius: 6,
                                    padding: "7px 10px",
                                    color: theme.textPrimary,
                                    fontSize: 13,
                                    outline: "none",
                                    resize: "vertical",
                                    fontFamily: "inherit",
                                }}
                            />
                        </div>
                        <div
                            style={{
                                display: "flex",
                                justifyContent: "flex-end",
                                gap: 8,
                            }}
                        >
                            <button
                                onClick={handleFeedbackClose}
                                style={{
                                    padding: "7px 14px",
                                    background: "transparent",
                                    border: ui.panel.borderSoft,
                                    borderRadius: 6,
                                    color: theme.textSecondary,
                                    fontSize: 13,
                                    cursor: "pointer",
                                }}
                            >
                                {TEXT.cancelLabel}
                            </button>
                            <button
                                onClick={handleFeedbackSubmit}
                                disabled={!title.trim()}
                                style={{
                                    padding: "7px 14px",
                                    background: title.trim()
                                        ? "rgba(99, 102, 241, 0.7)"
                                        : "rgba(99, 102, 241, 0.2)",
                                    border: "none",
                                    borderRadius: 6,
                                    color: title.trim()
                                        ? theme.textBright
                                        : theme.textDim,
                                    fontSize: 13,
                                    cursor: title.trim()
                                        ? "pointer"
                                        : "not-allowed",
                                }}
                            >
                                {TEXT.submitLabel}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}

export function Header() {
    return (
        <header
            style={{
                background: "#1e293b",
                color: "#f8fafc",
                padding: "12px 24px",
                display: "flex",
                alignItems: "center",
                gap: 12,
            }}
        >
            <svg
                width="24"
                height="24"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
            >
                <circle cx="12" cy="12" r="10" />
                <polyline points="12 6 12 12 16 14" />
            </svg>
            <div>
                <h1 style={{ margin: 0, fontSize: 18, fontWeight: 700 }}>
                    Seattle Commute: Car vs Transit
                </h1>
                <p style={{ margin: 0, fontSize: 12, opacity: 0.7 }}>
                    20 common routes across Seattle — click a route for details
                </p>
            </div>
        </header>
    );
}

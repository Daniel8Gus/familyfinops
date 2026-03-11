import { NavLink } from "react-router-dom";

interface LayoutProps {
  children: React.ReactNode;
  onRefresh?: () => void;
  lastUpdated?: Date | null;
  loading?: boolean;
}

const NAV_ITEMS = [
  { path: "/", label: "Dashboard", icon: "◈" },
  { path: "/paybox", label: "PayBox", icon: "⬡" },
  { path: "/analytics", label: "Analytics", icon: "◉" },
];

export function Layout({ children, onRefresh, lastUpdated, loading }: LayoutProps) {
  const now = lastUpdated
    ? lastUpdated.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" })
    : null;

  return (
    <div style={{ display: "flex", minHeight: "100vh" }}>
      {/* Sidebar */}
      <aside style={{
        width: 220,
        flexShrink: 0,
        background: "var(--bg-surface)",
        borderRight: "1px solid var(--border)",
        display: "flex",
        flexDirection: "column",
        padding: "24px 0",
        position: "sticky",
        top: 0,
        height: "100vh",
      }}>
        {/* Logo */}
        <div style={{ padding: "0 20px 28px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{
              width: 32, height: 32, borderRadius: 8,
              background: "linear-gradient(135deg, var(--green), var(--blue))",
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: 16,
            }}>🏠</div>
            <div>
              <div style={{ fontSize: 14, fontWeight: 700, lineHeight: 1.2 }}>FamilyFinOps</div>
              <div style={{ fontSize: 10, color: "var(--text-secondary)", letterSpacing: "0.05em" }}>HOUSEHOLD OS</div>
            </div>
          </div>
        </div>

        {/* Nav */}
        <nav style={{ flex: 1, padding: "0 12px" }}>
          {NAV_ITEMS.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              end={item.path === "/"}
              style={({ isActive }) => ({
                display: "flex",
                alignItems: "center",
                gap: 10,
                padding: "10px 12px",
                borderRadius: "var(--radius-sm)",
                marginBottom: 2,
                fontSize: 13,
                fontWeight: 500,
                color: isActive ? "var(--green)" : "var(--text-secondary)",
                background: isActive ? "var(--green-dim)" : "transparent",
                transition: "all 0.15s",
                textDecoration: "none",
              })}
            >
              <span style={{ fontSize: 16, lineHeight: 1 }}>{item.icon}</span>
              {item.label}
            </NavLink>
          ))}
        </nav>

        {/* Footer */}
        <div style={{ padding: "16px 20px 0", borderTop: "1px solid var(--border)" }}>
          <div style={{ fontSize: 10, color: "var(--text-muted)", marginBottom: 2 }}>Daniel · Shelly</div>
          <div style={{ fontSize: 10, color: "var(--text-muted)" }}>
            {now ? `Updated ${now}` : "Loading…"}
          </div>
        </div>
      </aside>

      {/* Main */}
      <div style={{ flex: 1, overflow: "auto" }}>
        {/* Header */}
        <header style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "20px 32px",
          borderBottom: "1px solid var(--border)",
          position: "sticky",
          top: 0,
          background: "rgba(15, 17, 23, 0.9)",
          backdropFilter: "blur(12px)",
          zIndex: 10,
        }}>
          <div style={{ fontSize: 12, color: "var(--text-secondary)" }}>
            {new Date().toLocaleDateString("en-US", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}
          </div>
          <button
            onClick={onRefresh}
            disabled={loading}
            style={{
              display: "flex", alignItems: "center", gap: 6,
              padding: "7px 14px",
              background: "transparent",
              border: "1px solid var(--border)",
              borderRadius: "var(--radius-sm)",
              color: "var(--text-secondary)",
              fontSize: 12,
              fontWeight: 500,
              transition: "all 0.15s",
              opacity: loading ? 0.5 : 1,
            }}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLButtonElement).style.borderColor = "var(--green)";
              (e.currentTarget as HTMLButtonElement).style.color = "var(--green)";
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLButtonElement).style.borderColor = "var(--border)";
              (e.currentTarget as HTMLButtonElement).style.color = "var(--text-secondary)";
            }}
          >
            <span style={{ display: "inline-block", animation: loading ? "spin 1s linear infinite" : "none" }}>↻</span>
            {loading ? "Refreshing…" : "Refresh"}
          </button>
        </header>

        {/* Page content */}
        <main style={{ padding: "32px" }}>
          {children}
        </main>
      </div>
    </div>
  );
}

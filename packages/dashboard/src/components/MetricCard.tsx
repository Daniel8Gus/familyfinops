import { Skeleton } from "./LoadingSkeleton.tsx";

interface MetricCardProps {
  label: string;
  value: string;
  sub?: string;
  trend?: { value: number; label: string };
  accent?: "green" | "red" | "blue" | "neutral" | "daniel" | "shelly" | "household" | "investments";
  loading?: boolean;
}

function formatTrend(value: number): string {
  const sign = value >= 0 ? "+" : "";
  return `${sign}${value.toFixed(1)}%`;
}

export function MetricCard({
  label,
  value,
  sub,
  trend,
  accent = "neutral",
  loading = false,
}: MetricCardProps) {
  const accentColor =
    accent === "green" ? "var(--green)" :
    accent === "red" ? "var(--red)" :
    accent === "blue" ? "var(--blue)" :
    accent === "daniel" ? "var(--daniel)" :
    accent === "shelly" ? "var(--shelly)" :
    accent === "household" ? "var(--household)" :
    accent === "investments" ? "var(--investments)" :
    "var(--text-primary)";

  const accentBg =
    accent === "green" ? "var(--green-dim)" :
    accent === "red" ? "var(--red-dim)" :
    accent === "blue" ? "var(--blue-dim)" :
    accent === "daniel" ? "var(--daniel-dim)" :
    accent === "shelly" ? "var(--shelly-dim)" :
    accent === "household" ? "var(--household-dim)" :
    accent === "investments" ? "var(--investments-dim)" :
    "transparent";

  if (loading) {
    return (
      <div style={{
        background: "var(--bg-card)",
        border: "1px solid var(--border)",
        borderRadius: "var(--radius)",
        padding: "24px",
      }}>
        <Skeleton width={90} height={11} style={{ marginBottom: 14 }} />
        <Skeleton width={150} height={36} style={{ marginBottom: 10 }} />
        <Skeleton width={110} height={11} />
      </div>
    );
  }

  return (
    <div style={{
      background: "var(--bg-card)",
      border: "1px solid var(--border)",
      borderRadius: "var(--radius)",
      padding: "24px",
      transition: "border-color 0.15s, background 0.15s",
      position: "relative",
      overflow: "hidden",
    }}
    onMouseEnter={(e) => {
      (e.currentTarget as HTMLDivElement).style.borderColor = "var(--border-hover)";
      (e.currentTarget as HTMLDivElement).style.background = "var(--bg-card-hover)";
    }}
    onMouseLeave={(e) => {
      (e.currentTarget as HTMLDivElement).style.borderColor = "var(--border)";
      (e.currentTarget as HTMLDivElement).style.background = "var(--bg-card)";
    }}
    >
      {/* Accent bar */}
      {accent !== "neutral" && (
        <div style={{
          position: "absolute",
          top: 0, left: 0,
          width: "3px", height: "100%",
          background: accentColor,
          borderRadius: "var(--radius) 0 0 var(--radius)",
        }} />
      )}

      <div style={{ paddingLeft: accent !== "neutral" ? 8 : 0 }}>
        <div style={{
          fontSize: 11,
          fontWeight: 500,
          letterSpacing: "0.08em",
          textTransform: "uppercase",
          color: "var(--text-secondary)",
          marginBottom: 10,
        }}>
          {label}
        </div>

        <div style={{
          fontFamily: "var(--font-mono)",
          fontSize: 30,
          fontWeight: 500,
          color: accentColor,
          lineHeight: 1.1,
          marginBottom: 8,
        }}>
          {value}
        </div>

        {sub && (
          <div style={{
            fontSize: 12,
            color: "var(--text-secondary)",
            marginBottom: trend ? 8 : 0,
          }}>
            {sub}
          </div>
        )}

        {trend && (
          <div style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 4,
            fontSize: 11,
            fontWeight: 500,
            padding: "3px 8px",
            borderRadius: 20,
            background: trend.value >= 0 ? "var(--red-dim)" : "var(--green-dim)",
            color: trend.value >= 0 ? "var(--red)" : "var(--green)",
          }}>
            {trend.value >= 0 ? "↑" : "↓"} {formatTrend(Math.abs(trend.value))} {trend.label}
          </div>
        )}

        {accent !== "neutral" && (
          <div style={{
            position: "absolute",
            bottom: 0, right: 0,
            width: 80, height: 80,
            borderRadius: "50%",
            background: accentBg,
            transform: "translate(20px, 20px)",
          }} />
        )}
      </div>
    </div>
  );
}

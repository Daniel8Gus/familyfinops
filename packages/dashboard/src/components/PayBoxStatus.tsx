import type { PayboxStatus } from "../api/client.ts";
import { Skeleton } from "./LoadingSkeleton.tsx";

interface Props {
  status: PayboxStatus | null;
  target: number;
  loading?: boolean;
}

function nis(v: number): string {
  return "₪" + Math.round(v).toLocaleString("en-US");
}

function ProgressBar({ value, max, color = "var(--green)" }: { value: number; max: number; color?: string }) {
  const pct = max > 0 ? Math.min(100, (value / max) * 100) : 0;
  return (
    <div style={{ position: "relative", height: 8, background: "rgba(255,255,255,0.06)", borderRadius: 4, overflow: "hidden" }}>
      <div style={{
        position: "absolute", left: 0, top: 0, height: "100%",
        width: `${pct}%`, background: color,
        borderRadius: 4, transition: "width 0.6s ease",
      }} />
    </div>
  );
}

export function PayBoxStatus({ status, target, loading = false }: Props) {
  if (loading) {
    return (
      <div style={{ background: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: "var(--radius)", padding: 24 }}>
        <Skeleton width={120} height={12} style={{ marginBottom: 16 }} />
        <Skeleton width={180} height={48} style={{ marginBottom: 20 }} />
        <Skeleton height={8} style={{ marginBottom: 12 }} />
        <Skeleton height={8} />
      </div>
    );
  }

  const s = status ?? { balance: 0, danielTotal: 0, shellyTotal: 0, totalContributed: 0, totalPaid: 0, stillNeeded: target };

  const overallPct = target > 0 ? Math.round((s.totalContributed / target) * 100) : 0;

  return (
    <div style={{ background: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: "var(--radius)", padding: 24 }}>
      <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: "0.08em", textTransform: "uppercase", color: "var(--text-secondary)", marginBottom: 12 }}>
        PayBox
      </div>

      <div style={{ fontFamily: "var(--font-mono)", fontSize: 40, fontWeight: 500, color: "var(--green)", marginBottom: 4 }}>
        {nis(s.balance)}
      </div>
      <div style={{ fontSize: 12, color: "var(--text-secondary)", marginBottom: 20 }}>
        Current balance · {nis(s.stillNeeded)} still needed
      </div>

      {/* Overall progress */}
      <div style={{ marginBottom: 16 }}>
        <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, color: "var(--text-secondary)", marginBottom: 6 }}>
          <span>Monthly target</span>
          <span style={{ fontFamily: "var(--font-mono)", color: "var(--text-primary)" }}>{overallPct}%</span>
        </div>
        <ProgressBar value={s.totalContributed} max={target} />
        <div style={{ display: "flex", justifyContent: "space-between", fontSize: 10, color: "var(--text-muted)", marginTop: 4 }}>
          <span>{nis(s.totalContributed)} contributed</span>
          <span>{nis(target)} target</span>
        </div>
      </div>

      {/* Per-person */}
      <div style={{ display: "flex", flexDirection: "column", gap: 10, paddingTop: 12, borderTop: "1px solid var(--border)" }}>
        <div>
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, marginBottom: 6 }}>
            <span style={{ color: "var(--text-secondary)" }}>👤 Daniel</span>
            <span style={{ fontFamily: "var(--font-mono)", color: "var(--text-primary)", fontSize: 12 }}>{nis(s.danielTotal)}</span>
          </div>
          <ProgressBar value={s.danielTotal} max={target / 2} color="var(--blue)" />
        </div>
        <div>
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, marginBottom: 6 }}>
            <span style={{ color: "var(--text-secondary)" }}>👤 Shelly</span>
            <span style={{ fontFamily: "var(--font-mono)", color: "var(--text-primary)", fontSize: 12 }}>{nis(s.shellyTotal)}</span>
          </div>
          <ProgressBar value={s.shellyTotal} max={target / 2} color="var(--amber)" />
        </div>
      </div>
    </div>
  );
}

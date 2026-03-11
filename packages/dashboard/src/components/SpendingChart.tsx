import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Cell,
  LabelList,
} from "recharts";
import { Skeleton } from "./LoadingSkeleton.tsx";
import type { SpendingGroup } from "../api/client.ts";

interface Props {
  data: SpendingGroup[] | null;
  loading?: boolean;
  title?: string;
}

// Distinct, visually varied palette
const COLORS = [
  "#3b82f6","#8b5cf6","#10b981","#f59e0b","#f43f5e",
  "#14b8a6","#ec4899","#f97316","#84cc16","#06b6d4",
];

function nisShort(v: number): string {
  if (v >= 1000) return `₪${(v / 1000).toFixed(1)}k`;
  return `₪${Math.round(v)}`;
}

function nisLabel(v: number): string {
  if (v >= 1000) return `₪${(v / 1000).toFixed(0)}k`;
  return `₪${Math.round(v)}`;
}

const CustomTooltip = ({ active, payload }: {
  active?: boolean;
  payload?: Array<{ value: number; payload: SpendingGroup & { pct: number } }>;
}) => {
  if (!active || !payload?.length) return null;
  const d = payload[0].payload;
  return (
    <div style={{
      background: "rgba(15,23,41,0.97)", border: "1px solid var(--border)",
      borderRadius: "var(--radius-sm)", padding: "12px 16px",
      boxShadow: "0 8px 32px rgba(0,0,0,0.5)", minWidth: 180,
    }}>
      <div style={{ fontSize: 12, color: "var(--text-secondary)", marginBottom: 6 }}>{d.name}</div>
      <div style={{ fontFamily: "var(--font-mono)", fontSize: 18, fontWeight: 700, color: "var(--text-primary)", marginBottom: 4 }}>
        ₪{d.total.toLocaleString("en-US", { maximumFractionDigits: 0 })}
      </div>
      <div style={{ fontSize: 11, color: "var(--text-secondary)", marginBottom: 4 }}>{d.pct.toFixed(1)}% of total</div>
      {d.daniel > 0 && <div style={{ fontSize: 11, color: "var(--daniel)" }}>Daniel: ₪{d.daniel.toLocaleString("en-US", { maximumFractionDigits: 0 })}</div>}
      {d.shelly > 0 && <div style={{ fontSize: 11, color: "var(--shelly)" }}>Shelly: ₪{d.shelly.toLocaleString("en-US", { maximumFractionDigits: 0 })}</div>}
      <div style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 4 }}>{d.count} transaction{d.count !== 1 ? "s" : ""}</div>
    </div>
  );
};

export function SpendingChart({ data, loading = false, title = "Spending by Category" }: Props) {
  const total = (data ?? []).reduce((s, g) => s + g.total, 0);
  const chartData = (data ?? []).slice(0, 8).map((g) => ({
    ...g,
    label: g.name,
    pct: total > 0 ? (g.total / total) * 100 : 0,
  }));

  return (
    <div style={{ background: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: "var(--radius)", padding: "20px 24px" }}>
      <div style={{ fontSize: 13, fontWeight: 600, color: "var(--text-primary)", marginBottom: 20 }}>{title}</div>
      {loading ? (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {[...Array(5)].map((_, i) => <Skeleton key={i} height={24} width={`${80 - i * 10}%`} />)}
        </div>
      ) : chartData.length === 0 ? (
        <div style={{ color: "var(--text-secondary)", fontSize: 13, textAlign: "center", padding: "40px 0" }}>No spending data</div>
      ) : (
        <>
          <ResponsiveContainer width="100%" height={Math.max(180, chartData.length * 42)}>
            <BarChart data={chartData} layout="vertical" barSize={20} margin={{ left: 0, right: 72, top: 0, bottom: 0 }}>
              <XAxis type="number" tickFormatter={nisShort} tick={{ fontSize: 10, fill: "var(--text-secondary)" }} axisLine={false} tickLine={false} />
              <YAxis type="category" dataKey="label" width={80} tick={{ fontSize: 12, fill: "var(--text-secondary)" }} axisLine={false} tickLine={false} />
              <Tooltip content={<CustomTooltip />} cursor={{ fill: "rgba(255,255,255,0.03)" }} />
              <Bar dataKey="total" radius={[0, 4, 4, 0]}>
                <LabelList dataKey="total" position="right" formatter={nisLabel}
                  style={{ fill: "var(--text-secondary)", fontSize: 11, fontFamily: "var(--font-mono)" }} />
                {chartData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
          {/* Color-coded legend with % */}
          <div style={{ display: "flex", flexWrap: "wrap", gap: "8px 16px", marginTop: 16, paddingTop: 16, borderTop: "1px solid var(--border)" }}>
            {chartData.map((g, i) => (
              <div key={i} style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 11 }}>
                <div style={{ width: 8, height: 8, borderRadius: 2, background: COLORS[i % COLORS.length], flexShrink: 0 }} />
                <span style={{ color: "var(--text-secondary)" }}>{g.name}</span>
                <span style={{ color: "var(--text-muted)" }}>{g.pct.toFixed(0)}%</span>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

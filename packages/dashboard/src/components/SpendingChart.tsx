import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from "recharts";
import { Skeleton } from "./LoadingSkeleton.tsx";
import type { SpendingGroup } from "../api/client.ts";

interface Props {
  data: SpendingGroup[] | null;
  loading?: boolean;
}

function nisShort(v: number): string {
  if (v >= 1000) return `₪${(v / 1000).toFixed(1)}k`;
  return `₪${Math.round(v)}`;
}

const CustomTooltip = ({ active, payload }: { active?: boolean; payload?: Array<{ value: number; payload: SpendingGroup }> }) => {
  if (!active || !payload?.length) return null;
  const d = payload[0].payload;
  return (
    <div style={{
      background: "var(--bg-surface)",
      border: "1px solid var(--border)",
      borderRadius: "var(--radius-sm)",
      padding: "10px 14px",
      fontFamily: "var(--font-sans)",
    }}>
      <div style={{ fontSize: 12, color: "var(--text-secondary)", marginBottom: 4 }}>{d.name}</div>
      <div style={{ fontFamily: "var(--font-mono)", color: "var(--green)", fontSize: 16, fontWeight: 500 }}>
        ₪{d.total.toLocaleString("he-IL", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
      </div>
      <div style={{ fontSize: 11, color: "var(--text-secondary)", marginTop: 4 }}>{d.count} transactions</div>
    </div>
  );
};

export function SpendingChart({ data, loading = false }: Props) {
  const chartData = (data ?? []).slice(0, 10).map((g) => ({
    ...g,
    label: g.name.length > 12 ? g.name.slice(0, 12) + "…" : g.name,
  }));

  const COLORS = [
    "#10b981","#34d399","#059669","#6ee7b7","#065f46",
    "#0d9488","#14b8a6","#2dd4bf","#0891b2","#06b6d4",
  ];

  return (
    <div style={{
      background: "var(--bg-card)",
      border: "1px solid var(--border)",
      borderRadius: "var(--radius)",
      padding: "20px 24px",
    }}>
      <div style={{ fontSize: 13, fontWeight: 600, color: "var(--text-primary)", marginBottom: 20 }}>
        Spending by Category
      </div>
      {loading ? (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {[...Array(6)].map((_, i) => (
            <Skeleton key={i} height={24} width={`${75 - i * 8}%`} />
          ))}
        </div>
      ) : chartData.length === 0 ? (
        <div style={{ color: "var(--text-secondary)", fontSize: 13, textAlign: "center", padding: "40px 0" }}>
          No spending data
        </div>
      ) : (
        <ResponsiveContainer width="100%" height={Math.max(200, chartData.length * 36)}>
          <BarChart data={chartData} layout="vertical" barSize={18} margin={{ left: 8, right: 40, top: 0, bottom: 0 }}>
            <XAxis type="number" tickFormatter={nisShort} tick={{ fontSize: 11, fill: "var(--text-secondary)" }} axisLine={false} tickLine={false} />
            <YAxis type="category" dataKey="label" width={100} tick={{ fontSize: 12, fill: "var(--text-secondary)" }} axisLine={false} tickLine={false} />
            <Tooltip content={<CustomTooltip />} cursor={{ fill: "rgba(255,255,255,0.03)" }} />
            <Bar dataKey="total" radius={[0, 4, 4, 0]}>
              {chartData.map((_, i) => (
                <Cell key={i} fill={COLORS[i % COLORS.length]} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      )}
    </div>
  );
}

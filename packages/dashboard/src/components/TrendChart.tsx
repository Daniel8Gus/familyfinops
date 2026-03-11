import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import { Skeleton } from "./LoadingSkeleton.tsx";
import type { MonthTrend } from "../api/client.ts";

interface Props {
  data: MonthTrend[] | null;
  loading?: boolean;
}

function nisShort(v: number): string {
  if (Math.abs(v) >= 1000) return `₪${(v / 1000).toFixed(0)}k`;
  return `₪${Math.round(v)}`;
}

function prettyMonth(ym: string): string {
  const [y, m] = ym.split("-");
  const d = new Date(Number(y), Number(m) - 1, 1);
  return d.toLocaleDateString("en-US", { month: "short", year: "2-digit" });
}

const CustomTooltip = ({ active, payload, label }: {
  active?: boolean;
  payload?: Array<{ color: string; name: string; value: number }>;
  label?: string;
}) => {
  if (!active || !payload?.length) return null;
  return (
    <div style={{
      background: "var(--bg-surface)",
      border: "1px solid var(--border)",
      borderRadius: "var(--radius-sm)",
      padding: "12px 16px",
      fontFamily: "var(--font-sans)",
      minWidth: 160,
    }}>
      <div style={{ fontSize: 12, color: "var(--text-secondary)", marginBottom: 8 }}>{label}</div>
      {payload.map((p) => (
        <div key={p.name} style={{ display: "flex", justifyContent: "space-between", gap: 16, fontSize: 12, marginBottom: 4 }}>
          <span style={{ color: p.color }}>{p.name}</span>
          <span style={{ fontFamily: "var(--font-mono)", color: p.color, fontWeight: 500 }}>
            {p.value < 0 ? "-" : ""}₪{Math.abs(p.value).toLocaleString("he-IL", { maximumFractionDigits: 0 })}
          </span>
        </div>
      ))}
    </div>
  );
};

export function TrendChart({ data, loading = false }: Props) {
  const chartData = (data ?? []).map((d) => ({
    ...d,
    label: prettyMonth(d.month),
  }));

  return (
    <div style={{
      background: "var(--bg-card)",
      border: "1px solid var(--border)",
      borderRadius: "var(--radius)",
      padding: "20px 24px",
    }}>
      <div style={{ fontSize: 13, fontWeight: 600, color: "var(--text-primary)", marginBottom: 20 }}>
        Monthly Trend
      </div>
      {loading ? (
        <Skeleton height={200} />
      ) : chartData.length === 0 ? (
        <div style={{ color: "var(--text-secondary)", fontSize: 13, textAlign: "center", padding: "40px 0" }}>
          No trend data
        </div>
      ) : (
        <ResponsiveContainer width="100%" height={220}>
          <LineChart data={chartData} margin={{ left: 0, right: 16, top: 4, bottom: 0 }}>
            <XAxis dataKey="label" tick={{ fontSize: 11, fill: "var(--text-secondary)" }} axisLine={false} tickLine={false} />
            <YAxis tickFormatter={nisShort} tick={{ fontSize: 11, fill: "var(--text-secondary)" }} axisLine={false} tickLine={false} width={52} />
            <Tooltip content={<CustomTooltip />} />
            <Legend
              formatter={(v) => <span style={{ fontSize: 11, color: "var(--text-secondary)" }}>{v}</span>}
            />
            <Line type="monotone" dataKey="income" name="Income" stroke="var(--green)" strokeWidth={2} dot={{ r: 3, fill: "var(--green)" }} activeDot={{ r: 5 }} />
            <Line type="monotone" dataKey="expenses" name="Expenses" stroke="var(--red)" strokeWidth={2} dot={{ r: 3, fill: "var(--red)" }} activeDot={{ r: 5 }} />
            <Line type="monotone" dataKey="net" name="Net" stroke="var(--blue)" strokeWidth={2} strokeDasharray="4 2" dot={{ r: 3, fill: "var(--blue)" }} activeDot={{ r: 5 }} />
          </LineChart>
        </ResponsiveContainer>
      )}
    </div>
  );
}

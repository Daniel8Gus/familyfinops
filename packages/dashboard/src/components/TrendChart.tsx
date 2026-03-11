import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Legend,
  ReferenceLine,
} from "recharts";
import { Skeleton } from "./LoadingSkeleton.tsx";
import type { MonthTrend } from "../api/client.ts";

interface Props {
  data: MonthTrend[] | null;
  loading?: boolean;
  title?: string;
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
      background: "rgba(15,23,41,0.97)", border: "1px solid var(--border)",
      borderRadius: "var(--radius-sm)", padding: "12px 16px",
      boxShadow: "0 8px 32px rgba(0,0,0,0.5)", minWidth: 180,
    }}>
      <div style={{ fontSize: 10, color: "var(--text-secondary)", marginBottom: 10, fontWeight: 600, letterSpacing: "0.06em", textTransform: "uppercase" }}>
        {label}
      </div>
      {payload.map((p) => (
        <div key={p.name} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 20, fontSize: 12, marginBottom: 6 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <div style={{ width: 8, height: 8, borderRadius: "50%", background: p.color, flexShrink: 0 }} />
            <span style={{ color: "var(--text-secondary)" }}>{p.name}</span>
          </div>
          <span style={{ fontFamily: "var(--font-mono)", fontWeight: 700, color: p.color, fontSize: 13 }}>
            {p.value < 0 ? "-" : ""}₪{Math.abs(p.value).toLocaleString("en-US", { maximumFractionDigits: 0 })}
          </span>
        </div>
      ))}
    </div>
  );
};

export function TrendChart({ data, loading = false, title = "Monthly Trend" }: Props) {
  const currentMonth = new Date().toISOString().slice(0, 7);
  const chartData = (data ?? []).map((d) => ({
    ...d,
    label: prettyMonth(d.month),
    isCurrent: d.month === currentMonth,
  }));
  const currentLabel = chartData.find((d) => d.isCurrent)?.label ?? null;

  const renderDot = (color: string) => (props: unknown) => {
    const { cx, cy, payload } = props as { cx: number; cy: number; payload: { isCurrent: boolean } };
    return (
      <circle
        key={`${color}-${cx}`}
        cx={cx} cy={cy}
        r={payload.isCurrent ? 6 : 3}
        fill={color}
        stroke={payload.isCurrent ? "var(--bg-page)" : "none"}
        strokeWidth={payload.isCurrent ? 2 : 0}
      />
    );
  };

  return (
    <div style={{ background: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: "var(--radius)", padding: "20px 24px" }}>
      <div style={{ fontSize: 13, fontWeight: 600, color: "var(--text-primary)", marginBottom: 20 }}>{title}</div>
      {loading ? (
        <Skeleton height={240} />
      ) : chartData.length === 0 ? (
        <div style={{ color: "var(--text-secondary)", fontSize: 13, textAlign: "center", padding: "40px 0" }}>No trend data</div>
      ) : (
        <ResponsiveContainer width="100%" height={240}>
          <LineChart data={chartData} margin={{ left: 0, right: 16, top: 8, bottom: 0 }}>
            <XAxis dataKey="label" tick={{ fontSize: 11, fill: "var(--text-secondary)" }} axisLine={false} tickLine={false} />
            <YAxis tickFormatter={nisShort} tick={{ fontSize: 11, fill: "var(--text-secondary)" }} axisLine={false} tickLine={false} width={52} />
            <Tooltip content={<CustomTooltip />} />
            <Legend formatter={(v) => <span style={{ fontSize: 11, color: "var(--text-secondary)" }}>{v}</span>} />
            {currentLabel && (
              <ReferenceLine x={currentLabel} stroke="rgba(255,255,255,0.12)" strokeDasharray="4 3"
                label={{ value: "Now", fill: "var(--text-muted)", fontSize: 9, position: "insideTopRight" }} />
            )}
            <Line type="monotone" dataKey="income" name="Income" stroke="var(--green)" strokeWidth={2}
              dot={renderDot("var(--green)")} activeDot={{ r: 6, fill: "var(--green)" }} />
            <Line type="monotone" dataKey="expenses" name="Expenses" stroke="var(--red)" strokeWidth={2}
              dot={renderDot("var(--red)")} activeDot={{ r: 6, fill: "var(--red)" }} />
            <Line type="monotone" dataKey="net" name="Net" stroke="var(--blue)" strokeWidth={2} strokeDasharray="5 3"
              dot={renderDot("var(--blue)")} activeDot={{ r: 6, fill: "var(--blue)" }} />
          </LineChart>
        </ResponsiveContainer>
      )}
    </div>
  );
}

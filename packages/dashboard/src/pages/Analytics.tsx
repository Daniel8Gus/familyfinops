import { SpendingChart } from "../components/SpendingChart.tsx";
import { TrendChart } from "../components/TrendChart.tsx";
import { Skeleton } from "../components/LoadingSkeleton.tsx";
import type { FinanceState } from "../hooks/useFinanceData.ts";
import type { Transaction } from "../api/client.ts";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell,
} from "recharts";

interface Props {
  state: FinanceState;
}

function nis(v: number): string {
  return "₪" + Math.round(v).toLocaleString("en-US");
}

function topMerchants(txs: Transaction[]): Array<{ name: string; total: number; count: number }> {
  const map = new Map<string, { total: number; count: number }>();
  for (const tx of txs.filter((t) => !t.isIncome)) {
    const name = tx.businessName || "(unknown)";
    const cur = map.get(name) ?? { total: 0, count: 0 };
    map.set(name, { total: cur.total + tx.amount, count: cur.count + 1 });
  }
  return Array.from(map.entries())
    .map(([name, v]) => ({ name, ...v }))
    .sort((a, b) => b.total - a.total)
    .slice(0, 8);
}

function IncomeVsExpenses({ data }: { data: FinanceState["daniel"]["trends"] }) {
  if (!data || data.length === 0) return null;
  const chartData = data.map((d) => ({
    month: d.month.slice(5), // MM
    income: Math.round(d.income),
    expenses: Math.round(d.expenses),
  }));
  return (
    <ResponsiveContainer width="100%" height={200}>
      <BarChart data={chartData} barGap={4} margin={{ left: 0, right: 8, top: 0, bottom: 0 }}>
        <XAxis dataKey="month" tick={{ fontSize: 11, fill: "var(--text-secondary)" }} axisLine={false} tickLine={false} />
        <YAxis tickFormatter={(v) => `₪${(v / 1000).toFixed(0)}k`} tick={{ fontSize: 11, fill: "var(--text-secondary)" }} axisLine={false} tickLine={false} width={48} />
        <Tooltip
          contentStyle={{
            background: "var(--bg-surface)", border: "1px solid var(--border)",
            borderRadius: "var(--radius-sm)", fontFamily: "var(--font-sans)", fontSize: 12,
          }}
          formatter={(v: number, name: string) => [nis(v), name === "income" ? "Income" : "Expenses"]}
        />
        <Bar dataKey="income" radius={[3, 3, 0, 0]} barSize={14}>
          {chartData.map((_, i) => <Cell key={i} fill="var(--green)" />)}
        </Bar>
        <Bar dataKey="expenses" radius={[3, 3, 0, 0]} barSize={14}>
          {chartData.map((_, i) => <Cell key={i} fill="var(--red)" />)}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}

export function Analytics({ state }: Props) {
  const { household, daniel, loading } = state;
  const transactions = household.transactions ?? [];
  const merchants = topMerchants(transactions);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
      <div>
        <h1 style={{ fontSize: 22, fontWeight: 700, marginBottom: 4 }}>Analytics</h1>
        <p style={{ fontSize: 13, color: "var(--text-secondary)" }}>Deep dive into spending patterns</p>
      </div>

      {/* Row 1: spending + trend */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
        <SpendingChart data={household.spending} loading={loading} />
        <TrendChart data={daniel.trends} loading={loading} />
      </div>

      {/* Row 2: income vs expenses + top merchants */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
        <div style={{ background: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: "var(--radius)", padding: "20px 24px" }}>
          <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 20 }}>Income vs Expenses</div>
          {loading ? <Skeleton height={200} /> : <IncomeVsExpenses data={daniel.trends} />}
        </div>

        <div style={{ background: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: "var(--radius)", padding: "20px 24px" }}>
          <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 20 }}>Top Merchants</div>
          {loading ? (
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {[...Array(5)].map((_, i) => <Skeleton key={i} height={20} />)}
            </div>
          ) : merchants.length === 0 ? (
            <div style={{ color: "var(--text-secondary)", fontSize: 13, padding: "20px 0", textAlign: "center" }}>No data</div>
          ) : (
            merchants.map((m, i) => {
              const maxTotal = merchants[0].total;
              const pct = (m.total / maxTotal) * 100;
              return (
                <div key={i} style={{ marginBottom: 14 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, marginBottom: 5 }}>
                    <span style={{ color: "var(--text-secondary)", maxWidth: 180, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }} title={m.name}>
                      {i + 1}. {m.name}
                    </span>
                    <span style={{ fontFamily: "var(--font-mono)", color: "var(--text-primary)", fontSize: 12 }}>{nis(m.total)}</span>
                  </div>
                  <div style={{ height: 4, background: "rgba(255,255,255,0.06)", borderRadius: 2 }}>
                    <div style={{ width: `${pct}%`, height: "100%", background: "var(--blue)", borderRadius: 2, transition: "width 0.4s" }} />
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}

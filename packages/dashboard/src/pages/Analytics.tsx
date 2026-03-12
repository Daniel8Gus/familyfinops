import { SpendingChart } from "../components/SpendingChart.tsx";
import { TrendChart } from "../components/TrendChart.tsx";
import { Skeleton } from "../components/LoadingSkeleton.tsx";
import type { FinanceState } from "../hooks/useFinanceData.ts";
import type { Transaction } from "../api/client.ts";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from "recharts";

interface Props {
  state: FinanceState;
}

function nis(v: number): string {
  return "₪" + Math.round(v).toLocaleString("en-US");
}

// Credit card batch payments to exclude from merchant analysis
const CREDIT_CARD_PATTERNS = [
  "ישראכרט", "מקס איט", "ויזה מקס", "כרטיסי אשראי",
  "לאומי ויזה", "לאומי קארד", "הרשאה מקס", "הרשאה דינרס",
  "העברה באינטרנט", "העברה בינקאית", "החזר שיק",
];

function topMerchants(txs: Transaction[]): Array<{ name: string; total: number; count: number }> {
  const map = new Map<string, { total: number; count: number }>();
  for (const tx of txs) {
    if (tx.isIncome) continue;
    if (CREDIT_CARD_PATTERNS.some((p) => tx.businessName.includes(p))) continue;
    const name = tx.businessName || "(unknown)";
    const cur = map.get(name) ?? { total: 0, count: 0 };
    map.set(name, { total: cur.total + tx.amount, count: cur.count + 1 });
  }
  return Array.from(map.entries())
    .map(([name, v]) => ({ name, ...v }))
    .sort((a, b) => b.total - a.total)
    .slice(0, 8);
}

const MONTHS = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];

function IncomeVsExpenses({ data }: { data: FinanceState["daniel"]["trends"] }) {
  if (!data || data.length === 0) return null;
  const chartData = data.map((d) => ({
    month: MONTHS[parseInt(d.month.slice(5), 10) - 1] ?? d.month.slice(5),
    income: Math.round(d.income),
    expenses: Math.round(d.expenses),
  }));
  return (
    <ResponsiveContainer width="100%" height={200}>
      <BarChart data={chartData} barGap={4} margin={{ left: 0, right: 8, top: 0, bottom: 0 }}>
        <XAxis dataKey="month" tick={{ fontSize: 11, fill: "var(--text-secondary)" }} axisLine={false} tickLine={false} />
        <YAxis tickFormatter={(v) => `₪${(v / 1000).toFixed(0)}k`} tick={{ fontSize: 11, fill: "var(--text-secondary)" }} axisLine={false} tickLine={false} width={48} />
        <Tooltip
          contentStyle={{ background: "rgba(15,23,41,0.97)", border: "1px solid var(--border)", borderRadius: "var(--radius-sm)", fontFamily: "var(--font-sans)", fontSize: 12 }}
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
  const { daniel, shelly, loading } = state;

  // Combine both profiles' transactions for merchant list (CCs already filtered above)
  const allTxs = [...(daniel.transactions ?? []), ...(shelly.transactions ?? [])];
  const merchants = topMerchants(allTxs);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
      <div>
        <h1 style={{ fontSize: 22, fontWeight: 700, marginBottom: 4 }}>Analytics</h1>
        <p style={{ fontSize: 13, color: "var(--text-secondary)" }}>
          Real expenses only — credit card batch payments excluded
        </p>
      </div>

      {/* Daniel spending + trend */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
        <SpendingChart data={daniel.spending} loading={loading} title="Daniel's Spending" />
        <TrendChart data={daniel.trends} loading={loading} />
      </div>

      {/* Income vs Expenses + Top Merchants */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
        <div style={{ background: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: "var(--radius)", padding: "20px 24px" }}>
          <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 4 }}>Income vs Real Expenses</div>
          <div style={{ fontSize: 11, color: "var(--text-secondary)", marginBottom: 16 }}>Credit card payments removed</div>
          {loading ? <Skeleton height={200} /> : <IncomeVsExpenses data={daniel.trends} />}
        </div>

        <div style={{ background: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: "var(--radius)", padding: "20px 24px" }}>
          <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 4 }}>Top Merchants</div>
          <div style={{ fontSize: 11, color: "var(--text-secondary)", marginBottom: 16 }}>Bank fees and direct charges only</div>
          {loading ? (
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {[...Array(5)].map((_, i) => <Skeleton key={i} height={20} />)}
            </div>
          ) : merchants.length === 0 ? (
            <div style={{ color: "var(--text-secondary)", fontSize: 13, padding: "20px 0", textAlign: "center" }}>
              No individual merchant data. Connect credit cards in RiseUp for full breakdown.
            </div>
          ) : (
            merchants.map((m, i) => {
              const maxTotal = merchants[0].total;
              const pct = (m.total / maxTotal) * 100;
              return (
                <div key={i} style={{ marginBottom: 14 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, marginBottom: 5 }}>
                    <span style={{ color: "var(--text-secondary)", maxWidth: 200, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }} title={m.name}>
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

      {/* Shelly's spending if available */}
      {(shelly.spending?.length ?? 0) > 0 && (
        <SpendingChart data={shelly.spending} loading={loading} title="Shelly's Spending" />
      )}
    </div>
  );
}

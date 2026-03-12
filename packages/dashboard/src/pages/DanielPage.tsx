import { useEffect, useMemo, useState } from "react";
import { MetricCard } from "../components/MetricCard.tsx";
import { SpendingChart } from "../components/SpendingChart.tsx";
import { TrendChart } from "../components/TrendChart.tsx";
import { TransactionTable } from "../components/TransactionTable.tsx";
import type { FinanceState } from "../hooks/useFinanceData.ts";
import { api, type MonthTrend, type SpendingGroup, type Transaction } from "../api/client.ts";

function nis(v: number): string {
  return "₪" + Math.round(v).toLocaleString("en-US");
}

interface Props {
  state: FinanceState;
}

function spendingTrend(trends: FinanceState["daniel"]["trends"]): number | undefined {
  if (!trends || trends.length < 2) return undefined;
  const last = trends[trends.length - 1];
  const prev = trends[trends.length - 2];
  if (prev.expenses === 0) return undefined;
  return ((last.expenses - prev.expenses) / prev.expenses) * 100;
}

function prettyMonthLong(ym: string): string {
  const [y, m] = ym.split("-");
  const d = new Date(Number(y), Number(m) - 1, 1);
  return d.toLocaleDateString("en-US", { month: "long", year: "numeric" });
}

function getLastThreeMonths(trends: MonthTrend[] | null): MonthTrend[] {
  if (!trends) return [];
  const sorted = [...trends].sort((a, b) => a.month.localeCompare(b.month));
  return sorted.slice(-3);
}

function getDefaultSelectedMonth(trends: MonthTrend[] | null): string | undefined {
  if (!trends || trends.length === 0) return undefined;
  const sorted = [...trends].sort((a, b) => a.month.localeCompare(b.month));
  const current = new Date().toISOString().slice(0, 7);
  const lastComplete = [...sorted].reverse().find((t) => t.month < current);
  return (lastComplete ?? sorted[sorted.length - 1]).month;
}

export function DanielPage({ state }: Props) {
  const { daniel, loading } = state;
  const [selectedMonth, setSelectedMonth] = useState<string | undefined>(() =>
    getDefaultSelectedMonth(daniel.trends as MonthTrend[] | null),
  );
  const [monthSpending, setMonthSpending] = useState<SpendingGroup[] | null>(null);
  const [monthTransactions, setMonthTransactions] = useState<Transaction[] | null>(null);
  const [monthLoading, setMonthLoading] = useState(false);

  // Keep selectedMonth in sync if trends data arrives/changes
  useEffect(() => {
    if (!selectedMonth) {
      const def = getDefaultSelectedMonth(daniel.trends as MonthTrend[] | null);
      if (def) setSelectedMonth(def);
    }
  }, [daniel.trends, selectedMonth]);

  // Fetch month-specific spending + transactions when selection changes
  useEffect(() => {
    if (!selectedMonth) return;
    let cancelled = false;
    setMonthLoading(true);
    Promise.all([
      api.daniel.spending(selectedMonth),
      api.daniel.transactions(selectedMonth),
    ])
      .then(([spRes, txRes]) => {
        if (cancelled) return;
        setMonthSpending(spRes.data.data ?? null);
        setMonthTransactions(txRes.data.data ?? null);
      })
      .catch(() => {
        if (cancelled) return;
        setMonthSpending(null);
        setMonthTransactions(null);
      })
      .finally(() => {
        if (!cancelled) setMonthLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [selectedMonth]);

  const thisMonthSpending =
    (monthSpending ?? daniel.spending ?? []).reduce((s, g) => s + g.total, 0);
  const trend = spendingTrend(daniel.trends);

  const lastThree = useMemo(
    () => getLastThreeMonths(daniel.trends as MonthTrend[] | null),
    [daniel.trends],
  );
  const currentMonth = new Date().toISOString().slice(0, 7);

  if (daniel.error && daniel.accounts.length === 0) {
    const isApiUnreachable = daniel.error.includes("API not reachable");
    return (
      <div style={{ padding: 24, maxWidth: 480 }}>
        <div style={{ color: "var(--red)", fontSize: 14, marginBottom: 12 }}>{daniel.error}</div>
        {isApiUnreachable && (
          <div style={{ fontSize: 13, color: "var(--text-secondary)", marginTop: 12 }}>
            In a terminal: <code style={{ background: "var(--bg-surface)", padding: "2px 6px", borderRadius: 4 }}>cd ~/Projects/familyfinops/packages/cli && npm run bot</code>
            <br />Then click Refresh above.
          </div>
        )}
      </div>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
      <div>
        <h1 style={{ fontSize: 22, fontWeight: 700, marginBottom: 4 }}>Daniel</h1>
        <p style={{ fontSize: 13, color: "var(--text-secondary)" }}>
          Your balance, spending & transactions
        </p>
      </div>

      {/* Three-month summary */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
          gap: 16,
        }}
      >
        {lastThree.map((m) => {
          const isCurrent = m.month === currentMonth;
          return (
            <div
              key={m.month}
              style={{
                borderRadius: "var(--radius)",
                border: isCurrent
                  ? "1px solid var(--blue)"
                  : "1px solid var(--border)",
                boxShadow: isCurrent ? "0 0 0 1px rgba(59,130,246,0.35)" : "none",
                background: "var(--bg-card)",
                padding: "16px 18px",
              }}
            >
              <div
                style={{
                  fontSize: 12,
                  fontWeight: 600,
                  textTransform: "uppercase",
                  letterSpacing: "0.06em",
                  color: "var(--text-secondary)",
                  marginBottom: 6,
                }}
              >
                {isCurrent ? "This month" : "Month summary"}
              </div>
              <div
                style={{
                  fontSize: 15,
                  fontWeight: 600,
                  marginBottom: 10,
                  color: "var(--text-primary)",
                }}
              >
                {prettyMonthLong(m.month)}
              </div>
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
                  gap: 8,
                  fontSize: 12,
                }}
              >
                <div>
                  <div style={{ color: "var(--text-secondary)", marginBottom: 2 }}>
                    Income
                  </div>
                  <div
                    style={{
                      fontFamily: "var(--font-mono)",
                      color: "var(--green)",
                      fontWeight: 600,
                    }}
                  >
                    {nis(m.income)}
                  </div>
                </div>
                <div>
                  <div style={{ color: "var(--text-secondary)", marginBottom: 2 }}>
                    Expenses
                  </div>
                  <div
                    style={{
                      fontFamily: "var(--font-mono)",
                      color: "var(--red)",
                      fontWeight: 600,
                    }}
                  >
                    {nis(m.expenses)}
                  </div>
                </div>
                <div>
                  <div style={{ color: "var(--text-secondary)", marginBottom: 2 }}>
                    Net
                  </div>
                  <div
                    style={{
                      fontFamily: "var(--font-mono)",
                      color: "var(--blue)",
                      fontWeight: 600,
                    }}
                  >
                    {nis(m.net)}
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <MetricCard
        label="Total balance"
        value={loading ? "—" : nis(daniel.total)}
        sub="Bank Leumi"
        accent="daniel"
        loading={loading}
      />

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
          gap: 16,
        }}
      >
        <MetricCard
          label={
            selectedMonth
              ? `Spending – ${prettyMonthLong(selectedMonth)}`
              : "Spending"
          }
          value={loading ? "—" : nis(thisMonthSpending)}
          trend={trend !== undefined ? { value: trend, label: "vs last month" } : undefined}
          accent="red"
          loading={loading || monthLoading}
        />
      </div>

      {/* Month selector + charts */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-end",
          gap: 16,
        }}
      >
        <div style={{ fontSize: 13, color: "var(--text-secondary)" }}>
          View spending for:
          <div style={{ marginTop: 8, display: "flex", gap: 8, flexWrap: "wrap" }}>
            {(daniel.trends ?? [])
              .slice()
              .sort((a, b) => a.month.localeCompare(b.month))
              .reverse()
              .map((t) => {
                const active = t.month === selectedMonth;
                return (
                  <button
                    key={t.month}
                    type="button"
                    onClick={() => setSelectedMonth(t.month)}
                    style={{
                      padding: "4px 10px",
                      borderRadius: 999,
                      border: active
                        ? "1px solid var(--blue)"
                        : "1px solid var(--border)",
                      background: active ? "var(--blue-dim)" : "transparent",
                      color: active ? "var(--blue)" : "var(--text-secondary)",
                      fontSize: 11,
                      cursor: "pointer",
                    }}
                  >
                    {prettyMonthLong(t.month)}
                  </button>
                );
              })}
          </div>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
        <SpendingChart
          data={monthSpending ?? daniel.spending}
          loading={loading || monthLoading}
        />
        <TrendChart data={daniel.trends} loading={loading} />
      </div>

      <TransactionTable
        data={monthTransactions ?? daniel.transactions}
        loading={loading || monthLoading}
        limit={20}
      />
    </div>
  );
}

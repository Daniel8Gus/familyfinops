import { MetricCard } from "../components/MetricCard.tsx";
import { SpendingChart } from "../components/SpendingChart.tsx";
import { TrendChart } from "../components/TrendChart.tsx";
import { TransactionTable } from "../components/TransactionTable.tsx";
import type { FinanceState } from "../hooks/useFinanceData.ts";

function nis(v: number): string {
  return "₪" + Math.round(v).toLocaleString("en-US");
}

interface Props {
  state: FinanceState;
}

function spendingTrend(trends: FinanceState["shelly"]["trends"]): number | undefined {
  if (!trends || trends.length < 2) return undefined;
  const last = trends[trends.length - 1];
  const prev = trends[trends.length - 2];
  if (prev.expenses === 0) return undefined;
  return ((last.expenses - prev.expenses) / prev.expenses) * 100;
}

export function ShellyPage({ state }: Props) {
  const { shelly, loading } = state;
  const thisMonthSpending = (shelly.spending ?? []).reduce((s, g) => s + g.total, 0);
  const trend = spendingTrend(shelly.trends);

  if (shelly.error && shelly.accounts.length === 0) {
    const isApiUnreachable = shelly.error.includes("API not reachable");
    return (
      <div style={{ padding: 24, maxWidth: 480 }}>
        <div style={{ color: "var(--red)", fontSize: 14, marginBottom: 12 }}>{shelly.error}</div>
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
        <h1 style={{ fontSize: 22, fontWeight: 700, marginBottom: 4 }}>Shelly</h1>
        <p style={{ fontSize: 13, color: "var(--text-secondary)" }}>
          Your balance, spending & transactions
        </p>
      </div>

      <MetricCard
        label="Total balance"
        value={loading ? "—" : nis(shelly.total)}
        sub="Mizrahi"
        accent="shelly"
        loading={loading}
      />

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: 16 }}>
        <MetricCard
          label="This month spending"
          value={loading ? "—" : nis(thisMonthSpending)}
          trend={trend !== undefined ? { value: trend, label: "vs last month" } : undefined}
          accent="red"
          loading={loading}
        />
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
        <SpendingChart data={shelly.spending} loading={loading} />
        <TrendChart data={shelly.trends} loading={loading} />
      </div>

      <TransactionTable data={shelly.transactions} loading={loading} limit={20} />
    </div>
  );
}

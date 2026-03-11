import { MetricCard } from "../components/MetricCard.tsx";
import { SpendingChart } from "../components/SpendingChart.tsx";
import { TrendChart } from "../components/TrendChart.tsx";
import { TransactionTable } from "../components/TransactionTable.tsx";
import { PayBoxStatus } from "../components/PayBoxStatus.tsx";
import type { FinanceState } from "../hooks/useFinanceData.ts";

function nis(v: number): string {
  return "₪" + Math.round(v).toLocaleString("en-US");
}

function spendingTrend(trends: FinanceState["data"]["trends"]): number | undefined {
  if (!trends || trends.length < 2) return undefined;
  const last = trends[trends.length - 1];
  const prev = trends[trends.length - 2];
  if (prev.expenses === 0) return undefined;
  return ((last.expenses - prev.expenses) / prev.expenses) * 100;
}

interface Props {
  state: FinanceState;
}

export function Dashboard({ state }: Props) {
  const { data, loading } = state;

  const totalBalance = data.balance?.total ?? 0;
  const thisMonthSpending = (data.spending ?? []).reduce((s, g) => s + g.total, 0);
  const payboxBalance = data.payboxStatus?.balance ?? 0;
  const payboxPct = data.payboxTarget > 0
    ? Math.round(((data.payboxStatus?.totalContributed ?? 0) / data.payboxTarget) * 100)
    : 0;
  const trend = spendingTrend(data.trends);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
      {/* Page title */}
      <div>
        <h1 style={{ fontSize: 22, fontWeight: 700, marginBottom: 4 }}>Overview</h1>
        <p style={{ fontSize: 13, color: "var(--text-secondary)" }}>
          Daniel's financial dashboard · {new Date().toLocaleDateString("en-US", { month: "long", year: "numeric" })}
        </p>
      </div>

      {/* Metric cards */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 16 }}>
        <MetricCard
          label="Total Balance"
          value={nis(totalBalance)}
          sub="Bank Leumi"
          accent="green"
          loading={loading}
        />
        <MetricCard
          label="This Month Spending"
          value={nis(thisMonthSpending)}
          trend={trend !== undefined ? { value: trend, label: "vs last month" } : undefined}
          accent="red"
          loading={loading}
        />
        <MetricCard
          label="PayBox Balance"
          value={nis(payboxBalance)}
          sub={`${payboxPct}% of target`}
          accent="blue"
          loading={loading}
        />
        <MetricCard
          label="Monthly Target"
          value={nis(data.payboxTarget)}
          sub={`₪${Math.round(data.payboxStatus?.stillNeeded ?? data.payboxTarget)} remaining`}
          accent="neutral"
          loading={loading}
        />
      </div>

      {/* Charts row */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
        <SpendingChart data={data.spending} loading={loading} />
        <TrendChart data={data.trends} loading={loading} />
      </div>

      {/* Bottom row: paybox + transactions */}
      <div style={{ display: "grid", gridTemplateColumns: "320px 1fr", gap: 16 }}>
        <PayBoxStatus status={data.payboxStatus} target={data.payboxTarget} loading={loading} />
        <TransactionTable data={data.transactions} loading={loading} limit={10} />
      </div>
    </div>
  );
}

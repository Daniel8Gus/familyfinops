import { MetricCard } from "../components/MetricCard.tsx";
import { SpendingChart } from "../components/SpendingChart.tsx";
import { TransactionTable } from "../components/TransactionTable.tsx";
import { PayBoxStatus } from "../components/PayBoxStatus.tsx";
import type { FinanceState } from "../hooks/useFinanceData.ts";

function nis(v: number): string {
  return "₪" + Math.round(v).toLocaleString("en-US");
}

interface Props {
  state: FinanceState;
}

export function HouseholdPage({ state }: Props) {
  const { household, paybox, loading } = state;
  const balance = household.balance;
  const danielTotal = balance?.daniel?.reduce((s, b) => s + b.balance, 0) ?? 0;
  const shellyTotal = balance?.shelly?.reduce((s, b) => s + b.balance, 0) ?? 0;
  const combinedTotal = balance?.combined_total ?? 0;
  const spendingTotal = (household.spending ?? []).reduce((s, g) => s + g.total, 0);

  if (household.error && !balance) {
    const isApiUnreachable = household.error.includes("API not reachable");
    return (
      <div style={{ padding: 24, maxWidth: 480 }}>
        <div style={{ color: "var(--red)", fontSize: 14, marginBottom: 12 }}>
          {household.error}
        </div>
        {isApiUnreachable && (
          <div style={{ fontSize: 13, color: "var(--text-secondary)", marginTop: 12 }}>
            In a terminal: <code style={{ background: "var(--bg-surface)", padding: "2px 6px", borderRadius: 4 }}>cd ~/Projects/familyfinops/packages/cli && npm run bot</code>
            <br />
            Then click Refresh above.
          </div>
        )}
      </div>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
      <div>
        <h1 style={{ fontSize: 22, fontWeight: 700, marginBottom: 4 }}>Household</h1>
        <p style={{ fontSize: 13, color: "var(--text-secondary)" }}>
          Combined view · Daniel & Shelly
        </p>
      </div>

      {/* Combined total */}
      <div style={{
        background: "var(--bg-card)",
        border: "1px solid var(--border)",
        borderRadius: "var(--radius)",
        padding: "32px 40px",
        textAlign: "center",
      }}>
        <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: "0.1em", textTransform: "uppercase", color: "var(--text-secondary)", marginBottom: 8 }}>
          Total household balance
        </div>
        <div style={{ fontFamily: "var(--font-mono)", fontSize: 48, fontWeight: 500, color: "var(--household)", lineHeight: 1 }}>
          {loading ? "—" : nis(combinedTotal)}
        </div>
      </div>

      {/* Daniel | Shelly cards */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 16 }}>
        <MetricCard
          label="Daniel"
          value={loading ? "—" : nis(danielTotal)}
          sub="Bank Leumi"
          accent="daniel"
          loading={loading}
        />
        <MetricCard
          label="Shelly"
          value={loading ? "—" : nis(shellyTotal)}
          sub="Mizrahi"
          accent="shelly"
          loading={loading}
        />
      </div>

      {/* PayBox + Combined spending */}
      <div style={{ display: "grid", gridTemplateColumns: "320px 1fr", gap: 16 }}>
        <PayBoxStatus
          status={paybox.status}
          target={paybox.monthly_target}
          loading={loading}
        />
        <SpendingChart data={household.spending} loading={loading} />
      </div>

      {/* Combined spending total + transactions */}
      <div style={{ display: "grid", gridTemplateColumns: "minmax(0, 1fr)", gap: 16 }}>
        <MetricCard
          label="This month spending (combined)"
          value={loading ? "—" : nis(spendingTotal)}
          accent="red"
          loading={loading}
        />
        <TransactionTable data={household.transactions} loading={loading} limit={15} />
      </div>
    </div>
  );
}

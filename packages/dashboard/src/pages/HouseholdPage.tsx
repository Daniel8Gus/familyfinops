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

function SummaryCard({ state }: { state: FinanceState }) {
  const { daniel, shelly, household, paybox } = state;

  const danielIncome = daniel.trends?.[daniel.trends.length - 1]?.income ?? 0;
  const danielExpenses = daniel.trends?.[daniel.trends.length - 1]?.expenses ?? 0;
  const danielNet = danielIncome - danielExpenses;

  const shellyIncome = shelly.trends?.[shelly.trends.length - 1]?.income ?? 0;
  const shellyExpenses = shelly.trends?.[shelly.trends.length - 1]?.expenses ?? 0;
  const shellyNet = shellyIncome - shellyExpenses;

  const mutualTotal = (household.spending ?? []).reduce((s, g) => s + g.total, 0);

  // Biggest spending category for Daniel (from his personal spending)
  const biggestCat = (daniel.spending ?? []).sort((a, b) => b.total - a.total)[0];

  const now = new Date();
  const monthLabel = now.toLocaleDateString("he-IL", { month: "long", year: "numeric" });

  return (
    <div style={{
      background: "var(--bg-card)", border: "1px solid var(--border)",
      borderRadius: "var(--radius)", padding: "20px 24px",
    }}>
      <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: "0.08em", textTransform: "uppercase", color: "var(--text-secondary)", marginBottom: 12 }}>
        Summary · {monthLabel}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 16, marginBottom: 16 }}>
        {danielNet !== 0 && (
          <div>
            <div style={{ fontSize: 11, color: "var(--text-secondary)", marginBottom: 4 }}>Daniel net</div>
            <div style={{ fontFamily: "var(--font-mono)", fontSize: 20, fontWeight: 700, color: danielNet >= 0 ? "var(--green)" : "var(--red)" }}>
              {danielNet >= 0 ? "+" : ""}{nis(danielNet)}
            </div>
          </div>
        )}
        {shellyNet !== 0 && (
          <div>
            <div style={{ fontSize: 11, color: "var(--text-secondary)", marginBottom: 4 }}>Shelly net</div>
            <div style={{ fontFamily: "var(--font-mono)", fontSize: 20, fontWeight: 700, color: shellyNet >= 0 ? "var(--green)" : "var(--red)" }}>
              {shellyNet >= 0 ? "+" : ""}{nis(shellyNet)}
            </div>
          </div>
        )}
        <div>
          <div style={{ fontSize: 11, color: "var(--text-secondary)", marginBottom: 4 }}>Mutual expenses</div>
          <div style={{ fontFamily: "var(--font-mono)", fontSize: 20, fontWeight: 700, color: "var(--text-primary)" }}>
            {nis(mutualTotal)}
          </div>
        </div>
        {paybox.status && (
          <div>
            <div style={{ fontSize: 11, color: "var(--text-secondary)", marginBottom: 4 }}>PayBox balance</div>
            <div style={{ fontFamily: "var(--font-mono)", fontSize: 20, fontWeight: 700, color: "var(--household)" }}>
              {nis(paybox.status.balance)}
            </div>
          </div>
        )}
      </div>

      {biggestCat && (
        <div style={{ fontSize: 12, color: "var(--text-secondary)", paddingTop: 12, borderTop: "1px solid var(--border)" }}>
          Daniel's biggest expense this month: <span style={{ color: "var(--text-primary)", fontWeight: 500 }}>{biggestCat.name}</span> — {nis(biggestCat.total)}
        </div>
      )}
    </div>
  );
}

export function HouseholdPage({ state }: Props) {
  const { household, paybox, loading } = state;
  const balance = household.balance;
  const danielTotal = balance?.daniel?.reduce((s, b) => s + b.balance, 0) ?? 0;
  const shellyTotal = balance?.shelly?.reduce((s, b) => s + b.balance, 0) ?? 0;
  const combinedTotal = balance?.combined_total ?? 0;

  if (household.error && !balance) {
    const isApiUnreachable = household.error.includes("API not reachable");
    return (
      <div style={{ padding: 24, maxWidth: 480 }}>
        <div style={{ color: "var(--red)", fontSize: 14, marginBottom: 12 }}>{household.error}</div>
        {isApiUnreachable && (
          <div style={{ fontSize: 13, color: "var(--text-secondary)", marginTop: 12 }}>
            In a terminal: <code style={{ background: "var(--bg-surface)", padding: "2px 6px", borderRadius: 4 }}>
              cd ~/Projects/familyfinops/packages/cli && npm run bot
            </code>
            <br />Then click Refresh above.
          </div>
        )}
      </div>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
      <div>
        <h1 style={{ fontSize: 22, fontWeight: 700, marginBottom: 4 }}>Household</h1>
        <p style={{ fontSize: 13, color: "var(--text-secondary)" }}>Combined view · Daniel & Shelly</p>
      </div>

      {/* Combined total balance */}
      <div style={{
        background: "var(--bg-card)", border: "1px solid var(--border)",
        borderRadius: "var(--radius)", padding: "32px 40px", textAlign: "center",
      }}>
        <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: "0.1em", textTransform: "uppercase", color: "var(--text-secondary)", marginBottom: 8 }}>
          Total household balance
        </div>
        <div style={{ fontFamily: "var(--font-mono)", fontSize: 48, fontWeight: 700, color: "var(--household)", lineHeight: 1 }}>
          {loading ? "—" : nis(combinedTotal)}
        </div>
      </div>

      {/* Daniel | Shelly cards */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 16 }}>
        <MetricCard label="Daniel" value={loading ? "—" : nis(danielTotal)} sub="Bank Leumi" accent="daniel" loading={loading} />
        <MetricCard label="Shelly" value={loading ? "—" : nis(shellyTotal)} sub="Mizrahi" accent="shelly" loading={loading} />
      </div>

      {/* Monthly summary card */}
      {!loading && <SummaryCard state={state} />}

      {/* PayBox + Mutual expenses chart */}
      <div style={{ display: "grid", gridTemplateColumns: "320px 1fr", gap: 16 }}>
        <PayBoxStatus status={paybox.status} target={paybox.monthly_target} loading={loading} />
        <SpendingChart
          data={household.spending}
          loading={loading}
          title="Mutual Expenses This Month"
        />
      </div>

      {/* Combined transactions feed */}
      <TransactionTable
        data={household.transactions}
        loading={loading}
        limit={15}
        title="Household Transactions"
      />
    </div>
  );
}

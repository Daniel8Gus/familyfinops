import { PieChart, Pie, Cell, ResponsiveContainer } from "recharts";
import { Skeleton } from "../components/LoadingSkeleton.tsx";
import type { FinanceState } from "../hooks/useFinanceData.ts";
import type { InvestmentAccount } from "../api/client.ts";

function nis(v: number): string {
  return "₪" + Math.round(v).toLocaleString("en-US");
}

interface Props {
  state: FinanceState;
}

const FUND_COLORS = ["#f59e0b", "#3b82f6", "#10b981", "#8b5cf6", "#f43f5e"];

function AccountCard({ account }: { account: InvestmentAccount }) {
  const total = account.totalValue;
  const fundColors = FUND_COLORS;

  // Build allocation data for donut if positions available
  const hasPositions = account.positions.length > 0;
  const positionTotal = account.positions.reduce((s, p) => s + p.units * p.avgBuyPrice, 0);

  return (
    <div style={{
      background: "var(--bg-card)", border: "1px solid var(--border)",
      borderRadius: "var(--radius)", padding: 24,
      borderTop: "3px solid var(--investments)",
    }}>
      <div style={{ fontSize: 10, fontWeight: 600, letterSpacing: "0.08em", textTransform: "uppercase", color: "var(--shelly)", marginBottom: 6 }}>
        {account.owner} · {account.source} · {account.product}
      </div>
      <div style={{ fontFamily: "var(--font-mono)", fontSize: 36, fontWeight: 700, color: "var(--investments)", marginBottom: 4, lineHeight: 1 }}>
        {nis(total)}
      </div>
      {account.lastUpdated && (
        <div style={{ fontSize: 11, color: "var(--text-muted)", marginBottom: 16 }}>
          Updated {new Date(account.lastUpdated).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
        </div>
      )}

      {hasPositions && (
        <>
          <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: "0.07em", textTransform: "uppercase", color: "var(--text-secondary)", marginBottom: 10, paddingTop: 12, borderTop: "1px solid var(--border)" }}>
            Positions
          </div>
          {account.positions.map((p, i) => {
            const cost = p.units * p.avgBuyPrice;
            const pct = positionTotal > 0 ? (cost / positionTotal) * 100 : 0;
            return (
              <div key={i} style={{ marginBottom: 14 }}>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, marginBottom: 6 }}>
                  <span style={{ color: "var(--text-primary)", fontWeight: 500 }}>{p.name}</span>
                  <span style={{ fontFamily: "var(--font-mono)", color: fundColors[i % fundColors.length], fontWeight: 700 }}>
                    {pct.toFixed(0)}%
                  </span>
                </div>
                <div style={{ height: 4, background: "rgba(255,255,255,0.06)", borderRadius: 2 }}>
                  <div style={{ width: `${pct}%`, height: "100%", background: fundColors[i % fundColors.length], borderRadius: 2 }} />
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, color: "var(--text-secondary)", marginTop: 4 }}>
                  <span>{p.units.toLocaleString("en-US")} units</span>
                  <span>avg ₪{p.avgBuyPrice.toFixed(2)}</span>
                </div>
              </div>
            );
          })}

          {/* Mini donut */}
          {account.positions.length >= 2 && (
            <div style={{ display: "flex", alignItems: "center", gap: 16, marginTop: 16, paddingTop: 12, borderTop: "1px solid var(--border)" }}>
              <ResponsiveContainer width={80} height={80}>
                <PieChart>
                  <Pie
                    data={account.positions.map((p) => ({ value: p.units * p.avgBuyPrice, name: p.name }))}
                    cx="50%" cy="50%"
                    innerRadius={24} outerRadius={38}
                    dataKey="value" strokeWidth={2} stroke="var(--bg-card)"
                  >
                    {account.positions.map((_, i) => <Cell key={i} fill={fundColors[i % fundColors.length]} />)}
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                {account.positions.map((p, i) => {
                  const cost = p.units * p.avgBuyPrice;
                  const pct = positionTotal > 0 ? (cost / positionTotal) * 100 : 0;
                  return (
                    <div key={i} style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 11 }}>
                      <div style={{ width: 8, height: 8, borderRadius: 2, background: fundColors[i % fundColors.length], flexShrink: 0 }} />
                      <span style={{ color: "var(--text-secondary)" }}>{p.name.split(" ").slice(0, 3).join(" ")}</span>
                      <span style={{ color: "var(--text-muted)" }}>{pct.toFixed(0)}%</span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

export function InvestmentsPage({ state }: Props) {
  const { investments, loading } = state;
  const accounts = investments.accounts ?? [];
  const totalValue = accounts.reduce((s, a) => s + a.totalValue, 0);

  if (loading) {
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
        <Skeleton width={180} height={28} style={{ marginBottom: 4 }} />
        <Skeleton height={120} />
        <Skeleton height={260} />
      </div>
    );
  }

  if (accounts.length === 0) {
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 700, marginBottom: 4 }}>Investments</h1>
          <p style={{ fontSize: 13, color: "var(--text-secondary)" }}>Investment & savings accounts</p>
        </div>
        <div style={{
          background: "var(--bg-card)", border: "1px solid var(--border)",
          borderRadius: "var(--radius)", padding: "60px 40px", textAlign: "center",
        }}>
          <div style={{ fontSize: 40, marginBottom: 16 }}>📈</div>
          <div style={{ fontSize: 16, fontWeight: 600, marginBottom: 8 }}>
            No investment accounts connected yet
          </div>
          <div style={{ fontSize: 13, color: "var(--text-secondary)", maxWidth: 400, margin: "0 auto" }}>
            Connect brokerage or investment accounts in RiseUp to see your portfolio here.
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
      <div>
        <h1 style={{ fontSize: 22, fontWeight: 700, marginBottom: 4 }}>Investments</h1>
        <p style={{ fontSize: 13, color: "var(--text-secondary)" }}>
          Live portfolio data from RiseUp · {accounts.map((a) => a.owner).join(" & ")}
        </p>
      </div>

      {/* Total portfolio */}
      <div style={{
        background: "var(--bg-card)", border: "1px solid var(--border)",
        borderRadius: "var(--radius)", padding: "32px 40px", textAlign: "center",
      }}>
        <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: "0.1em", textTransform: "uppercase", color: "var(--text-secondary)", marginBottom: 8 }}>
          Total Portfolio Value
        </div>
        <div style={{ fontFamily: "var(--font-mono)", fontSize: 52, fontWeight: 700, color: "var(--investments)", lineHeight: 1, marginBottom: 8 }}>
          {nis(totalValue)}
        </div>
        <div style={{ fontSize: 12, color: "var(--text-secondary)" }}>
          {accounts.length} account{accounts.length !== 1 ? "s" : ""} · Individual holdings detail coming soon
        </div>
      </div>

      {/* Account cards */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(340px, 1fr))", gap: 16 }}>
        {accounts.map((account) => (
          <AccountCard key={account.id} account={account} />
        ))}
      </div>
    </div>
  );
}

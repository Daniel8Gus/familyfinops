import { Skeleton } from "../components/LoadingSkeleton.tsx";
import type { FinanceState } from "../hooks/useFinanceData.ts";
import type { InvestmentAccount } from "../api/client.ts";

function nis(v: number): string {
  return "₪" + Math.round(v).toLocaleString("en-US");
}

interface Props {
  state: FinanceState;
}

function AccountCard({ account }: { account: InvestmentAccount }) {
  const ownerColor = account.owner === "daniel" ? "var(--daniel)" : "var(--shelly)";
  return (
    <div
      style={{
        background: "var(--bg-card)",
        border: "1px solid var(--border)",
        borderRadius: "var(--radius)",
        padding: 24,
        position: "relative",
        overflow: "hidden",
      }}
    >
      <div
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          width: 3,
          height: "100%",
          background: "var(--investments)",
          borderRadius: "var(--radius) 0 0 var(--radius)",
        }}
      />
      <div style={{ paddingLeft: 8 }}>
        <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: "0.08em", textTransform: "uppercase", color: "var(--text-secondary)", marginBottom: 6 }}>
          <span style={{ color: ownerColor }}>{account.owner}</span> · {account.product}
        </div>
        <div style={{ fontSize: 16, fontWeight: 600, color: "var(--text-primary)", marginBottom: 4 }}>
          {account.name}
        </div>
        <div style={{ fontFamily: "var(--font-mono)", fontSize: 28, fontWeight: 500, color: "var(--investments)", marginBottom: 8 }}>
          {nis(account.totalValue)}
        </div>
        {account.lastUpdated && (
          <div style={{ fontSize: 11, color: "var(--text-muted)" }}>
            Updated {new Date(account.lastUpdated).toLocaleDateString()}
          </div>
        )}
        {account.positions && account.positions.length > 0 && (
          <div style={{ marginTop: 12, paddingTop: 12, borderTop: "1px solid var(--border)" }}>
            <div style={{ fontSize: 11, color: "var(--text-secondary)", marginBottom: 6 }}>Positions</div>
            {account.positions.slice(0, 3).map((p, i) => (
              <div key={i} style={{ display: "flex", justifyContent: "space-between", fontSize: 12, marginBottom: 4 }}>
                <span>{p.name}</span>
                <span style={{ fontFamily: "var(--font-mono)", color: "var(--text-primary)" }}>
                  {p.units.toLocaleString()} × ₪{p.avgBuyPrice.toFixed(2)}
                </span>
              </div>
            ))}
            {account.positions.length > 3 && (
              <div style={{ fontSize: 11, color: "var(--text-muted)" }}>+{account.positions.length - 3} more</div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export function InvestmentsPage({ state }: Props) {
  const { investments, loading } = state;
  const accounts = investments.accounts ?? [];
  const totalValue = accounts.reduce((s, a) => s + a.totalValue, 0);

  if (investments.error && accounts.length === 0) {
    return (
      <div style={{ padding: 24, color: "var(--red)", fontSize: 14 }}>
        {investments.error}
      </div>
    );
  }

  if (loading) {
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
        <div>
          <Skeleton width={140} height={28} style={{ marginBottom: 8 }} />
          <Skeleton width={260} height={14} />
        </div>
        <Skeleton height={120} />
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 16 }}>
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} height={180} />
          ))}
        </div>
      </div>
    );
  }

  if (accounts.length === 0) {
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 700, marginBottom: 4 }}>Investments</h1>
          <p style={{ fontSize: 13, color: "var(--text-secondary)" }}>
            Investment & savings accounts
          </p>
        </div>
        <div
          style={{
            background: "var(--bg-card)",
            border: "1px solid var(--border)",
            borderRadius: "var(--radius)",
            padding: "60px 40px",
            textAlign: "center",
          }}
        >
          <div style={{ fontSize: 48, marginBottom: 16 }}>📈</div>
          <div style={{ fontSize: 16, fontWeight: 600, color: "var(--text-primary)", marginBottom: 8 }}>
            No investment accounts connected yet
          </div>
          <div style={{ fontSize: 13, color: "var(--text-secondary)", maxWidth: 400, margin: "0 auto" }}>
            Connect investment or savings accounts in RiseUp to see your portfolio here.
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
          Investment & savings · Daniel & Shelly
        </p>
      </div>

      <div
        style={{
          background: "var(--bg-card)",
          border: "1px solid var(--border)",
          borderRadius: "var(--radius)",
          padding: "32px 40px",
          textAlign: "center",
        }}
      >
        <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: "0.1em", textTransform: "uppercase", color: "var(--text-secondary)", marginBottom: 8 }}>
          Total portfolio value
        </div>
        <div style={{ fontFamily: "var(--font-mono)", fontSize: 48, fontWeight: 500, color: "var(--investments)", lineHeight: 1 }}>
          {nis(totalValue)}
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 16 }}>
        {accounts.map((account) => (
          <AccountCard key={account.id} account={account} />
        ))}
      </div>
    </div>
  );
}

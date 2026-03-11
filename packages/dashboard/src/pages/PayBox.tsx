import { useState } from "react";
import { PayBoxStatus } from "../components/PayBoxStatus.tsx";
import { LogContributionModal, LogPaymentModal } from "../components/LogModal.tsx";
import type { FinanceState } from "../hooks/useFinanceData.ts";
import type { PayboxHistoryEntry } from "../api/client.ts";

function nis(v: number): string {
  return "₪" + Math.round(v).toLocaleString("en-US");
}

interface Props {
  state: FinanceState;
}

function HistoryRow({ entry }: { entry: PayboxHistoryEntry }) {
  const isContrib = entry.type === "contribution";
  return (
    <div style={{
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
      padding: "12px 0",
      borderBottom: "1px solid rgba(255,255,255,0.04)",
    }}>
      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        <div style={{
          width: 32, height: 32,
          borderRadius: 8,
          background: isContrib ? "var(--green-dim)" : "var(--red-dim)",
          display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: 14,
        }}>
          {isContrib ? "➕" : "💸"}
        </div>
        <div>
          <div style={{ fontSize: 13, fontWeight: 500, textTransform: "capitalize" }}>
            {isContrib ? `${entry.who ?? "Unknown"} contribution` : entry.category}
          </div>
          <div style={{ fontSize: 11, color: "var(--text-secondary)", marginTop: 2 }}>
            {entry.date}{entry.note ? ` · ${entry.note}` : ""}
          </div>
        </div>
      </div>
      <div style={{
        fontFamily: "var(--font-mono)",
        fontWeight: 500,
        fontSize: 14,
        color: isContrib ? "var(--green)" : "var(--red)",
      }}>
        {isContrib ? "+" : "-"}{nis(entry.amount)}
      </div>
    </div>
  );
}

export function PayBox({ state }: Props) {
  const { paybox, loading, refresh } = state;
  const [showContribute, setShowContribute] = useState(false);
  const [showPay, setShowPay] = useState(false);

  const btnStyle: React.CSSProperties = {
    flex: 1,
    padding: "10px 0",
    borderRadius: "var(--radius-sm)",
    fontSize: 13,
    fontWeight: 600,
    transition: "opacity 0.15s",
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 24, maxWidth: 800 }}>
      <div>
        <h1 style={{ fontSize: 22, fontWeight: 700, marginBottom: 4 }}>PayBox</h1>
        <p style={{ fontSize: 13, color: "var(--text-secondary)" }}>
          Shared household contributions · {new Date().toLocaleDateString("en-US", { month: "long", year: "numeric" })}
        </p>
      </div>

      {/* Big balance */}
      <div style={{
        background: "var(--bg-card)",
        border: "1px solid var(--border)",
        borderRadius: "var(--radius)",
        padding: "40px 32px",
        textAlign: "center",
      }}>
        <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: "0.1em", textTransform: "uppercase", color: "var(--text-secondary)", marginBottom: 12 }}>
          Current Balance
        </div>
        <div style={{ fontFamily: "var(--font-mono)", fontSize: 64, fontWeight: 500, color: "var(--green)", lineHeight: 1 }}>
          {loading ? "—" : nis(paybox.status?.balance ?? 0)}
        </div>
        <div style={{ fontSize: 13, color: "var(--text-secondary)", marginTop: 12 }}>
          {loading ? "" : `${nis(paybox.status?.stillNeeded ?? paybox.monthly_target)} still needed to reach ${nis(paybox.monthly_target)} target`}
        </div>

        {/* Action buttons */}
        <div style={{ display: "flex", gap: 12, maxWidth: 320, margin: "28px auto 0" }}>
          <button style={{ ...btnStyle, background: "var(--green)", color: "#fff" }}
            onClick={() => setShowContribute(true)}>
            + Contribute
          </button>
          <button style={{ ...btnStyle, background: "transparent", color: "var(--text-secondary)", border: "1px solid var(--border)" }}
            onClick={() => setShowPay(true)}>
            Log Payment
          </button>
        </div>
      </div>

      {/* Per-person progress */}
      <PayBoxStatus status={paybox.status} target={paybox.monthly_target} loading={loading} />

      {/* History */}
      <div style={{
        background: "var(--bg-card)",
        border: "1px solid var(--border)",
        borderRadius: "var(--radius)",
        padding: "20px 24px",
      }}>
        <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 4 }}>Transaction History</div>
        <div style={{ fontSize: 12, color: "var(--text-secondary)", marginBottom: 16 }}>Last 30 entries</div>

        {loading ? (
          <div style={{ color: "var(--text-secondary)", padding: "20px 0", textAlign: "center", fontSize: 13 }}>Loading…</div>
        ) : !paybox.history || paybox.history.length === 0 ? (
          <div style={{ color: "var(--text-secondary)", padding: "40px 0", textAlign: "center", fontSize: 13 }}>
            No transactions yet. Log a contribution to get started.
          </div>
        ) : (
          paybox.history.map((entry, i) => <HistoryRow key={i} entry={entry} />)
        )}
      </div>

      {showContribute && (
        <LogContributionModal onClose={() => setShowContribute(false)} onSuccess={refresh} />
      )}
      {showPay && (
        <LogPaymentModal onClose={() => setShowPay(false)} onSuccess={refresh} />
      )}
    </div>
  );
}

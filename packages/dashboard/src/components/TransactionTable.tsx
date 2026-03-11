import { useState } from "react";
import { Skeleton } from "./LoadingSkeleton.tsx";
import type { Transaction } from "../api/client.ts";

interface Props {
  data: Transaction[] | null;
  loading?: boolean;
  limit?: number;
}

function nis(v: number): string {
  return v.toLocaleString("he-IL", { style: "currency", currency: "ILS", minimumFractionDigits: 0, maximumFractionDigits: 0 })
    .replace(/[\u200E\u200F\u202A-\u202E\u00A0]/g, "")
    .replace(/\u2212/g, "-")
    .replace(/\s/g, "");
}

type SortKey = "date" | "amount";

export function TransactionTable({ data, loading = false, limit = 10 }: Props) {
  const [sortKey, setSortKey] = useState<SortKey>("date");
  const [sortAsc, setSortAsc] = useState(false);

  const handleSort = (key: SortKey) => {
    if (sortKey === key) setSortAsc((a) => !a);
    else { setSortKey(key); setSortAsc(false); }
  };

  const rows = (data ?? [])
    .slice()
    .sort((a, b) => {
      const mul = sortAsc ? 1 : -1;
      if (sortKey === "date") return mul * a.date.localeCompare(b.date);
      return mul * (a.amount - b.amount);
    })
    .slice(0, limit);

  const SortIcon = ({ col }: { col: SortKey }) => (
    <span style={{ opacity: sortKey === col ? 1 : 0.3, marginLeft: 4 }}>
      {sortKey === col ? (sortAsc ? "↑" : "↓") : "↕"}
    </span>
  );

  const th: React.CSSProperties = {
    padding: "10px 16px",
    textAlign: "left",
    fontSize: 11,
    fontWeight: 600,
    letterSpacing: "0.07em",
    textTransform: "uppercase",
    color: "var(--text-secondary)",
    borderBottom: "1px solid var(--border)",
    cursor: "pointer",
    userSelect: "none",
  };

  const td: React.CSSProperties = {
    padding: "12px 16px",
    fontSize: 13,
    borderBottom: "1px solid rgba(255,255,255,0.04)",
    color: "var(--text-primary)",
  };

  return (
    <div style={{
      background: "var(--bg-card)",
      border: "1px solid var(--border)",
      borderRadius: "var(--radius)",
      overflow: "hidden",
    }}>
      <div style={{ padding: "20px 24px 0", fontSize: 13, fontWeight: 600 }}>
        Recent Transactions
      </div>
      {loading ? (
        <div style={{ padding: 24, display: "flex", flexDirection: "column", gap: 12 }}>
          {[...Array(6)].map((_, i) => <Skeleton key={i} height={20} />)}
        </div>
      ) : rows.length === 0 ? (
        <div style={{ padding: "40px 24px", textAlign: "center", color: "var(--text-secondary)", fontSize: 13 }}>
          No transactions
        </div>
      ) : (
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr>
                <th style={th} onClick={() => handleSort("date")}>Date <SortIcon col="date" /></th>
                <th style={th}>Description</th>
                <th style={th}>Category</th>
                <th style={{ ...th, textAlign: "right" }} onClick={() => handleSort("amount")}>Amount <SortIcon col="amount" /></th>
              </tr>
            </thead>
            <tbody>
              {rows.map((tx, i) => (
                <tr key={i} style={{ transition: "background 0.1s" }}
                  onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(255,255,255,0.02)")}
                  onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
                >
                  <td style={{ ...td, color: "var(--text-secondary)", fontFamily: "var(--font-mono)", fontSize: 12 }}>{tx.date}</td>
                  <td style={{ ...td, maxWidth: 200, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }} title={tx.businessName}>{tx.businessName}</td>
                  <td style={td}>
                    <span style={{
                      display: "inline-block",
                      padding: "2px 8px",
                      borderRadius: 20,
                      fontSize: 11,
                      fontWeight: 500,
                      background: tx.isIncome ? "var(--green-dim)" : "rgba(255,255,255,0.05)",
                      color: tx.isIncome ? "var(--green)" : "var(--text-secondary)",
                    }}>
                      {tx.category}
                    </span>
                  </td>
                  <td style={{
                    ...td,
                    textAlign: "right",
                    fontFamily: "var(--font-mono)",
                    fontWeight: 500,
                    color: tx.isIncome ? "var(--green)" : "var(--red)",
                  }}>
                    {tx.isIncome ? "+" : "-"}{nis(tx.amount)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

import { useState } from "react";
import { Skeleton } from "./LoadingSkeleton.tsx";
import type { Transaction } from "../api/client.ts";

interface Props {
  data: Transaction[] | null;
  loading?: boolean;
  limit?: number;
  title?: string;
}

function nis(v: number): string {
  return "₪" + v.toLocaleString("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 0 });
}

type SortKey = "date" | "amount";

export function TransactionTable({ data, loading = false, limit = 10, title = "Recent Transactions" }: Props) {
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
    padding: "10px 16px", textAlign: "left", fontSize: 10, fontWeight: 600,
    letterSpacing: "0.08em", textTransform: "uppercase", color: "var(--text-secondary)",
    borderBottom: "1px solid var(--border)", cursor: "pointer", userSelect: "none",
  };

  return (
    <div style={{ background: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: "var(--radius)", overflow: "hidden" }}>
      <div style={{ padding: "20px 24px 16px", fontSize: 13, fontWeight: 600 }}>{title}</div>
      {loading ? (
        <div style={{ padding: "0 24px 24px", display: "flex", flexDirection: "column", gap: 10 }}>
          {[...Array(6)].map((_, i) => <Skeleton key={i} height={20} />)}
        </div>
      ) : rows.length === 0 ? (
        <div style={{ padding: "40px 24px", textAlign: "center", color: "var(--text-secondary)", fontSize: 13 }}>No transactions</div>
      ) : (
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr>
                <th style={th} onClick={() => handleSort("date")}>Date <SortIcon col="date" /></th>
                <th style={th}>Type</th>
                <th style={th}>Description</th>
                <th style={th}>Category</th>
                <th style={{ ...th, textAlign: "right" }} onClick={() => handleSort("amount")}>Amount <SortIcon col="amount" /></th>
              </tr>
            </thead>
            <tbody>
              {rows.map((tx, i) => (
                <tr key={i}
                  style={{
                    transition: "background 0.1s",
                    boxShadow: tx.isIncome ? "inset 3px 0 0 var(--green)" : "inset 3px 0 0 var(--red)",
                  }}
                  onMouseEnter={(e) => ((e.currentTarget as HTMLTableRowElement).style.background = "rgba(255,255,255,0.025)")}
                  onMouseLeave={(e) => ((e.currentTarget as HTMLTableRowElement).style.background = "transparent")}
                >
                  <td style={{ padding: "11px 16px", fontSize: 11, borderBottom: "1px solid rgba(255,255,255,0.04)", color: "var(--text-secondary)", fontFamily: "var(--font-mono)" }}>{tx.date}</td>
                  <td style={{ padding: "11px 16px", fontSize: 11, borderBottom: "1px solid rgba(255,255,255,0.04)" }}>
                    <span style={{
                      display: "inline-block", padding: "2px 6px", borderRadius: 4, fontSize: 10, fontWeight: 600,
                      background: tx.isIncome ? "var(--green-dim)" : "var(--red-dim)",
                      color: tx.isIncome ? "var(--green)" : "var(--red)",
                    }}>
                      {tx.isIncome ? "הכנסה" : "הוצאה"}
                    </span>
                  </td>
                  <td style={{ padding: "11px 16px", fontSize: 13, borderBottom: "1px solid rgba(255,255,255,0.04)", color: "var(--text-primary)", maxWidth: 200, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }} title={tx.businessName}>{tx.businessName}</td>
                  <td style={{ padding: "11px 16px", fontSize: 13, borderBottom: "1px solid rgba(255,255,255,0.04)" }}>
                    <span style={{
                      display: "inline-block", padding: "2px 8px", borderRadius: 20, fontSize: 11, fontWeight: 500,
                      background: tx.isIncome ? "var(--green-dim)" : "rgba(255,255,255,0.05)",
                      color: tx.isIncome ? "var(--green)" : "var(--text-secondary)",
                    }}>
                      {tx.category}
                    </span>
                  </td>
                  <td style={{
                    padding: "11px 16px", fontSize: 13, borderBottom: "1px solid rgba(255,255,255,0.04)",
                    textAlign: "right", fontFamily: "var(--font-mono)", fontWeight: 700,
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

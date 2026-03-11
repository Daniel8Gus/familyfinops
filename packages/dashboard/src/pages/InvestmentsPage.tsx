import {
  LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend,
  PieChart, Pie, Cell,
} from "recharts";
import { Skeleton } from "../components/LoadingSkeleton.tsx";
import type { FinanceState } from "../hooks/useFinanceData.ts";
import type { InvestmentAccount } from "../api/client.ts";

function nis(v: number): string {
  return "₪" + Math.round(v).toLocaleString("en-US");
}

interface Props {
  state: FinanceState;
}

// ── Mock data ─────────────────────────────────

const MOCK_HOLDINGS = [
  { name: "TASE:TEVA",      type: "Stock", value: 45000, pct: 25,  change: +3.2 },
  { name: "TASE:NICE",      type: "Stock", value: 36000, pct: 20,  change: -1.1 },
  { name: "Gov Bond 2028",  type: "Bond",  value: 54000, pct: 30,  change: +0.3 },
  { name: "Cash (ILS)",     type: "Cash",  value: 27000, pct: 15,  change:  0   },
  { name: "S&P 500 ETF",   type: "ETF",   value: 18000, pct: 10,  change: +1.8 },
];

const MOCK_TOTAL = MOCK_HOLDINGS.reduce((s, h) => s + h.value, 0);

const MOCK_ALLOCATION = [
  { name: "Stocks", value: 81000, color: "#3b82f6" },
  { name: "Bonds",  value: 54000, color: "#10b981" },
  { name: "Cash",   value: 27000, color: "#64748b" },
  { name: "ETF",    value: 18000, color: "#f59e0b" },
];

const MOCK_PERFORMANCE = [
  { month: "Apr '25", portfolio: 165000, benchmark: 162000 },
  { month: "May '25", portfolio: 168000, benchmark: 164000 },
  { month: "Jun '25", portfolio: 163000, benchmark: 161000 },
  { month: "Jul '25", portfolio: 170000, benchmark: 166000 },
  { month: "Aug '25", portfolio: 172000, benchmark: 167000 },
  { month: "Sep '25", portfolio: 168000, benchmark: 165000 },
  { month: "Oct '25", portfolio: 175000, benchmark: 170000 },
  { month: "Nov '25", portfolio: 178000, benchmark: 172000 },
  { month: "Dec '25", portfolio: 174000, benchmark: 169000 },
  { month: "Jan '26", portfolio: 177000, benchmark: 171000 },
  { month: "Feb '26", portfolio: 179000, benchmark: 173000 },
  { month: "Mar '26", portfolio: 180000, benchmark: 175000 },
];

// ── Subcomponents ─────────────────────────────

function Banner() {
  return (
    <div style={{
      display: "flex", alignItems: "center", gap: 10,
      background: "rgba(245, 158, 11, 0.08)", border: "1px solid rgba(245, 158, 11, 0.2)",
      borderRadius: "var(--radius-sm)", padding: "10px 16px", fontSize: 12,
      color: "var(--amber)",
    }}>
      <span>⚠️</span>
      <span>Live investment data coming soon — showing sample portfolio</span>
    </div>
  );
}

function HoldingsTable() {
  return (
    <div style={{ background: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: "var(--radius)", overflow: "hidden" }}>
      <div style={{ padding: "20px 24px 16px", fontSize: 13, fontWeight: 600 }}>Holdings</div>
      <div style={{ overflowX: "auto" }}>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr>
              {["Asset", "Type", "Value", "% Portfolio", "Monthly Change"].map((h) => (
                <th key={h} style={{
                  padding: "10px 16px", textAlign: h === "Value" || h === "% Portfolio" || h === "Monthly Change" ? "right" : "left",
                  fontSize: 10, fontWeight: 600, letterSpacing: "0.08em", textTransform: "uppercase",
                  color: "var(--text-secondary)", borderBottom: "1px solid var(--border)",
                }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {MOCK_HOLDINGS.map((h, i) => (
              <tr key={i}
                onMouseEnter={(e) => ((e.currentTarget as HTMLTableRowElement).style.background = "rgba(255,255,255,0.025)")}
                onMouseLeave={(e) => ((e.currentTarget as HTMLTableRowElement).style.background = "transparent")}
                style={{ transition: "background 0.1s" }}
              >
                <td style={{ padding: "12px 16px", fontWeight: 600, borderBottom: "1px solid rgba(255,255,255,0.04)", fontFamily: "var(--font-mono)", fontSize: 13 }}>{h.name}</td>
                <td style={{ padding: "12px 16px", borderBottom: "1px solid rgba(255,255,255,0.04)" }}>
                  <span style={{
                    display: "inline-block", padding: "2px 8px", borderRadius: 20, fontSize: 11, fontWeight: 500,
                    background: "rgba(255,255,255,0.06)", color: "var(--text-secondary)",
                  }}>{h.type}</span>
                </td>
                <td style={{ padding: "12px 16px", textAlign: "right", fontFamily: "var(--font-mono)", fontWeight: 700, borderBottom: "1px solid rgba(255,255,255,0.04)", fontSize: 13 }}>{nis(h.value)}</td>
                <td style={{ padding: "12px 16px", textAlign: "right", fontFamily: "var(--font-mono)", borderBottom: "1px solid rgba(255,255,255,0.04)", color: "var(--text-secondary)", fontSize: 12 }}>{h.pct}%</td>
                <td style={{
                  padding: "12px 16px", textAlign: "right", fontFamily: "var(--font-mono)", fontWeight: 700,
                  borderBottom: "1px solid rgba(255,255,255,0.04)", fontSize: 13,
                  color: h.change > 0 ? "var(--green)" : h.change < 0 ? "var(--red)" : "var(--text-secondary)",
                }}>
                  {h.change > 0 ? "+" : ""}{h.change.toFixed(1)}%
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function AllocationDonut() {
  return (
    <div style={{ background: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: "var(--radius)", padding: "20px 24px" }}>
      <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 20 }}>Allocation</div>
      <div style={{ display: "flex", alignItems: "center", gap: 24 }}>
        <PieChart width={160} height={160}>
          <Pie data={MOCK_ALLOCATION} cx="50%" cy="50%" innerRadius={45} outerRadius={75} dataKey="value" strokeWidth={2} stroke="var(--bg-card)">
            {MOCK_ALLOCATION.map((entry, i) => <Cell key={i} fill={entry.color} />)}
          </Pie>
        </PieChart>
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {MOCK_ALLOCATION.map((a, i) => (
            <div key={i} style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <div style={{ width: 10, height: 10, borderRadius: 3, background: a.color, flexShrink: 0 }} />
              <div>
                <div style={{ fontSize: 12, color: "var(--text-primary)", fontWeight: 500 }}>{a.name}</div>
                <div style={{ fontSize: 11, color: "var(--text-secondary)", fontFamily: "var(--font-mono)" }}>
                  {nis(a.value)} · {Math.round((a.value / MOCK_TOTAL) * 100)}%
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function PerformanceChart() {
  const nisK = (v: number) => `₪${(v / 1000).toFixed(0)}k`;

  const CustomTooltip = ({ active, payload, label }: {
    active?: boolean;
    payload?: Array<{ color: string; name: string; value: number }>;
    label?: string;
  }) => {
    if (!active || !payload?.length) return null;
    return (
      <div style={{ background: "rgba(15,23,41,0.97)", border: "1px solid var(--border)", borderRadius: "var(--radius-sm)", padding: "12px 16px", boxShadow: "0 8px 32px rgba(0,0,0,0.5)", minWidth: 180 }}>
        <div style={{ fontSize: 10, color: "var(--text-secondary)", marginBottom: 8, fontWeight: 600, letterSpacing: "0.05em", textTransform: "uppercase" }}>{label}</div>
        {payload.map((p) => (
          <div key={p.name} style={{ display: "flex", justifyContent: "space-between", gap: 20, fontSize: 12, marginBottom: 4 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <div style={{ width: 8, height: 8, borderRadius: "50%", background: p.color }} />
              <span style={{ color: "var(--text-secondary)" }}>{p.name}</span>
            </div>
            <span style={{ fontFamily: "var(--font-mono)", fontWeight: 700, color: p.color }}>
              ₪{p.value.toLocaleString("en-US")}
            </span>
          </div>
        ))}
      </div>
    );
  };

  return (
    <div style={{ background: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: "var(--radius)", padding: "20px 24px" }}>
      <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 20 }}>12-Month Performance</div>
      <ResponsiveContainer width="100%" height={220}>
        <LineChart data={MOCK_PERFORMANCE} margin={{ left: 0, right: 16, top: 8, bottom: 0 }}>
          <XAxis dataKey="month" tick={{ fontSize: 10, fill: "var(--text-secondary)" }} axisLine={false} tickLine={false} />
          <YAxis tickFormatter={nisK} tick={{ fontSize: 10, fill: "var(--text-secondary)" }} axisLine={false} tickLine={false} width={52} domain={["auto", "auto"]} />
          <Tooltip content={<CustomTooltip />} />
          <Legend formatter={(v) => <span style={{ fontSize: 11, color: "var(--text-secondary)" }}>{v}</span>} />
          <Line type="monotone" dataKey="portfolio" name="My Portfolio" stroke="var(--amber)" strokeWidth={2.5} dot={false} activeDot={{ r: 5, fill: "var(--amber)" }} />
          <Line type="monotone" dataKey="benchmark" name="TA-125" stroke="var(--text-secondary)" strokeWidth={1.5} strokeDasharray="4 3" dot={false} activeDot={{ r: 4 }} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

function RealAccountCard({ account }: { account: InvestmentAccount }) {
  return (
    <div style={{ background: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: "var(--radius)", padding: 24, borderLeft: "3px solid var(--shelly)" }}>
      <div style={{ fontSize: 10, fontWeight: 600, letterSpacing: "0.08em", textTransform: "uppercase", color: "var(--shelly)", marginBottom: 6 }}>
        {account.owner} · {account.product}
      </div>
      <div style={{ fontSize: 15, fontWeight: 600, marginBottom: 6 }}>{account.name}</div>
      <div style={{ fontFamily: "var(--font-mono)", fontSize: 28, fontWeight: 700, color: "var(--investments)", marginBottom: 8 }}>
        {nis(account.totalValue)}
      </div>
      {account.positions.map((p, i) => (
        <div key={i} style={{ display: "flex", justifyContent: "space-between", fontSize: 12, borderTop: i === 0 ? "1px solid var(--border)" : "none", paddingTop: i === 0 ? 10 : 0, marginTop: i === 0 ? 10 : 4 }}>
          <span style={{ color: "var(--text-secondary)" }}>{p.name}</span>
          <span style={{ fontFamily: "var(--font-mono)", color: "var(--text-primary)" }}>
            {p.units.toLocaleString()} units
          </span>
        </div>
      ))}
    </div>
  );
}

// ── Page ──────────────────────────────────────

export function InvestmentsPage({ state }: Props) {
  const { investments, loading } = state;
  const realAccounts = investments.accounts ?? [];

  if (loading) {
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
        <Skeleton width={180} height={28} style={{ marginBottom: 4 }} />
        <Skeleton height={40} />
        <Skeleton height={280} />
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
          <Skeleton height={200} /><Skeleton height={200} />
        </div>
      </div>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
      <div>
        <h1 style={{ fontSize: 22, fontWeight: 700, marginBottom: 4 }}>Investments</h1>
        <p style={{ fontSize: 13, color: "var(--text-secondary)" }}>Portfolio overview · Daniel & Shelly</p>
      </div>

      <Banner />

      {/* Real RiseUp data (Shelly's securities) */}
      {realAccounts.length > 0 && (
        <div>
          <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: "0.08em", textTransform: "uppercase", color: "var(--text-secondary)", marginBottom: 12 }}>
            Connected Accounts (RiseUp)
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))", gap: 16 }}>
            {realAccounts.map((a) => <RealAccountCard key={a.id} account={a} />)}
          </div>
        </div>
      )}

      {/* Mock portfolio analytics */}
      <div>
        <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: "0.08em", textTransform: "uppercase", color: "var(--text-secondary)", marginBottom: 12 }}>
          Sample Portfolio Analytics
        </div>

        {/* Total + allocation side by side */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 340px", gap: 16, marginBottom: 16 }}>
          {/* Total */}
          <div style={{ background: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: "var(--radius)", padding: "28px 36px", display: "flex", flexDirection: "column", justifyContent: "center" }}>
            <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: "0.1em", textTransform: "uppercase", color: "var(--text-secondary)", marginBottom: 8 }}>Total Portfolio Value</div>
            <div style={{ fontFamily: "var(--font-mono)", fontSize: 48, fontWeight: 700, color: "var(--investments)", lineHeight: 1, marginBottom: 8 }}>
              {nis(MOCK_TOTAL)}
            </div>
            <div style={{ display: "flex", gap: 24, marginTop: 8 }}>
              {[{ label: "Stocks", val: "₪81k", color: "#3b82f6" }, { label: "Bonds", val: "₪54k", color: "#10b981" }, { label: "Cash+ETF", val: "₪45k", color: "#f59e0b" }].map((s) => (
                <div key={s.label}>
                  <div style={{ fontSize: 11, color: "var(--text-secondary)" }}>{s.label}</div>
                  <div style={{ fontFamily: "var(--font-mono)", fontSize: 14, fontWeight: 700, color: s.color }}>{s.val}</div>
                </div>
              ))}
            </div>
          </div>
          <AllocationDonut />
        </div>

        {/* Performance chart */}
        <PerformanceChart />

        {/* Holdings table */}
        <div style={{ marginTop: 16 }}>
          <HoldingsTable />
        </div>
      </div>
    </div>
  );
}

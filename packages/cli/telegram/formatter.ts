import type {
  SpendingGroup,
  HouseholdBalanceData,
  HouseholdReportData,
} from "../src/commands/household.js";
import type { PayboxData, PayboxStatus } from "../src/data/paybox.js";

// ── Helpers ───────────────────────────────────

/** Escape characters that have special meaning in Telegram HTML mode. */
function esc(text: string | number): string {
  return String(text)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

/** Format a shekel amount (no ANSI codes, rounded to whole shekels). */
function nis(amount: number): string {
  return new Intl.NumberFormat("he-IL", {
    style: "currency",
    currency: "ILS",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  })
    .format(amount)
    .replace(/[\u200E\u200F\u202A-\u202E\u00A0\u2009]/g, "")
    .replace(/\u2212/g, "-")
    .replace(/\s/g, "");
}

/** Convert "2026-03" → "March 2026". */
function prettyMonth(ym: string): string {
  const [year, month] = ym.split("-");
  const date = new Date(Number(year), Number(month) - 1, 1);
  return date.toLocaleDateString("en-US", { month: "long", year: "numeric" });
}

/** Pick an emoji for a spending category (Hebrew category names from RiseUp). */
function categoryEmoji(name: string): string {
  const map: Record<string, string> = {
    מזון: "🛒",
    סופרמרקט: "🛒",
    מסעדות: "🍽️",
    קפה: "☕",
    תחבורה: "🚗",
    דלק: "⛽",
    חניה: "🅿️",
    תחבורה_ציבורית: "🚌",
    בידור: "🎬",
    קניות: "🛍️",
    ביגוד: "👗",
    בריאות: "💊",
    רפואה: "🏥",
    ספורט: "🏃",
    חינוך: "📚",
    ילדים: "👶",
    ביטוח: "🔒",
    תקשורת: "📱",
    אינטרנט: "🌐",
    דיור: "🏠",
    שכירות: "🏠",
    משכנתא: "🏠",
    חשמל: "⚡",
    מים: "💧",
    גז: "🔥",
    ארנונה: "🏙️",
    חופשה: "✈️",
    מתנות: "🎁",
    חסכון: "💰",
    השקעות: "📈",
    כללי: "💳",
    עמלות: "🏦",
    מילואים: "🪖",
    "(uncategorized)": "📋",
  };
  return map[name] ?? "💳";
}

// ── Spending ──────────────────────────────────

export function formatSpending(
  data: SpendingGroup[],
  month?: string,
  opts?: {
    topMerchants?: Array<{ name: string; total: number }>;
    biggestTx?: { amount: number; name: string; date: string } | null;
    lastMonthTotal?: number;
  },
): string {
  const header = month
    ? `📊 <b>Household Spending — ${prettyMonth(month)}</b>`
    : `📊 <b>Household Spending</b>`;

  const lines: string[] = [header, ""];

  for (const g of data) {
    const emoji = categoryEmoji(g.name);
    const parts: string[] = [];
    if (g.daniel > 0) parts.push(`Daniel ${nis(g.daniel)}`);
    if (g.shelly > 0) parts.push(`Shelly ${nis(g.shelly)}`);
    const breakdown = parts.length > 0 ? ` <i>(${parts.join(" | ")})</i>` : "";
    lines.push(`${emoji} ${esc(g.name)}: ${nis(g.total)}${breakdown}`);
  }

  const total = data.reduce((sum, g) => sum + g.total, 0);
  lines.push("");
  lines.push("─────────────────");
  lines.push(`💰 <b>Total: ${nis(total)}</b>`);

  // Month-over-month comparison
  if (opts?.lastMonthTotal !== undefined && opts.lastMonthTotal > 0) {
    const diff = total - opts.lastMonthTotal;
    const pct = ((diff / opts.lastMonthTotal) * 100).toFixed(0);
    const arrow = diff >= 0 ? "📈" : "📉";
    const sign = diff >= 0 ? "+" : "";
    lines.push(`${arrow} vs last month: ${sign}${nis(diff)} (${sign}${pct}%)`);
  }

  // Top merchants
  if (opts?.topMerchants && opts.topMerchants.length > 0) {
    lines.push("");
    lines.push("🏪 <b>Top merchants:</b>");
    for (const m of opts.topMerchants.slice(0, 3)) {
      lines.push(`  • ${esc(m.name)}: ${nis(m.total)}`);
    }
  }

  // Biggest transaction
  if (opts?.biggestTx) {
    lines.push("");
    lines.push(
      `⚠️ <b>Biggest:</b> ${nis(opts.biggestTx.amount)} — ${esc(opts.biggestTx.name)} <i>(${opts.biggestTx.date})</i>`,
    );
  }

  return lines.join("\n");
}

// ── Balance ───────────────────────────────────

export function formatBalance(data: HouseholdBalanceData): string {
  const lines: string[] = ["🏦 <b>Household Balances</b>", ""];

  const danielTotal = data.daniel.reduce((sum, b) => sum + b.balance, 0);
  const shellyTotal = data.shelly.reduce((sum, b) => sum + b.balance, 0);

  if (data.daniel.length > 0) {
    lines.push(`👤 <b>Daniel</b>`);
    for (const b of data.daniel) {
      const acct = b.accountNumberPiiValue ?? b.credentialsName ?? "Account";
      lines.push(`  • ${esc(acct)} <i>(${esc(b.source)})</i>: ${nis(b.balance)}`);
    }
    lines.push(`  <b>Subtotal: ${nis(danielTotal)}</b>`);
    lines.push("");
  }

  if (data.shelly.length > 0) {
    lines.push(`👤 <b>Shelly</b>`);
    for (const b of data.shelly) {
      const acct = b.accountNumberPiiValue ?? b.credentialsName ?? "Account";
      lines.push(`  • ${esc(acct)} <i>(${esc(b.source)})</i>: ${nis(b.balance)}`);
    }
    lines.push(`  <b>Subtotal: ${nis(shellyTotal)}</b>`);
    lines.push("");
  }

  lines.push("─────────────────");
  lines.push(`💰 <b>Combined Total: ${nis(data.combined_total)}</b>`);

  return lines.join("\n");
}

// ── Report ────────────────────────────────────

export function formatReport(data: HouseholdReportData): string {
  const lines: string[] = [
    `📋 <b>Household Report — ${prettyMonth(data.month)}</b>`,
    "",
    `💸 <b>Total Spending: ${nis(data.spending.total)}</b>`,
    "",
    "<b>Spending by Category:</b>",
  ];

  const top = data.spending.breakdown.slice(0, 10);
  for (const g of top) {
    const emoji = categoryEmoji(g.name);
    const parts: string[] = [];
    if (g.daniel > 0) parts.push(`Daniel ${nis(g.daniel)}`);
    if (g.shelly > 0) parts.push(`Shelly ${nis(g.shelly)}`);
    const breakdown = parts.length > 0 ? ` <i>(${parts.join(" | ")})</i>` : "";
    lines.push(`${emoji} ${esc(g.name)}: ${nis(g.total)}${breakdown}`);
  }
  if (data.spending.breakdown.length > 10) {
    lines.push(`  <i>…and ${data.spending.breakdown.length - 10} more</i>`);
  }

  lines.push("");
  lines.push("─────────────────");
  lines.push("🏦 <b>Account Balances:</b>");

  const danielTotal = data.balances.daniel.reduce((sum, b) => sum + b.balance, 0);
  const shellyTotal = data.balances.shelly.reduce((sum, b) => sum + b.balance, 0);

  if (data.balances.daniel.length > 0) {
    lines.push(`  👤 Daniel: <b>${nis(danielTotal)}</b>`);
  }
  if (data.balances.shelly.length > 0) {
    lines.push(`  👤 Shelly: <b>${nis(shellyTotal)}</b>`);
  }

  lines.push("");
  lines.push(`💰 <b>Combined Balance: ${nis(data.balances.combined_total)}</b>`);

  return lines.join("\n");
}

// ── PayBox ────────────────────────────────────

export function formatPayboxStatus(status: PayboxStatus, target: number): string {
  const pct = target > 0 ? Math.round((status.totalContributed / target) * 100) : 0;
  const bar = "█".repeat(Math.round(pct / 10)) + "░".repeat(10 - Math.round(pct / 10));

  const lines: string[] = [
    "💰 <b>PayBox Status</b>",
    "─────────────────",
    `Current balance: <b>${nis(status.balance)}</b>`,
    `Daniel contributed: ${nis(status.danielTotal)}`,
    `Shelly contributed: ${nis(status.shellyTotal)}`,
    "",
    `Target this month: ${nis(target)}`,
    `Progress: ${bar} ${pct}%`,
    `Still needed: <b>${nis(status.stillNeeded)}</b>`,
  ];

  if (status.totalPaid > 0) {
    lines.push(`Total paid out: ${nis(status.totalPaid)}`);
  }

  return lines.join("\n");
}

export function formatPayboxHistory(
  entries: Array<{
    type: "contribution" | "payment";
    date: string;
    amount: number;
    who?: string;
    category?: string;
    note?: string;
  }>,
): string {
  if (entries.length === 0) {
    return "💰 <b>PayBox History</b>\n\nNo transactions yet.";
  }

  const lines: string[] = ["💰 <b>PayBox History</b>", "─────────────────"];

  for (const e of entries) {
    const emoji = e.type === "contribution" ? "➕" : "💸";
    const who = e.who ? ` (${e.who})` : "";
    const note = e.note ? ` — <i>${esc(e.note)}</i>` : "";
    const cat = e.category ? ` [${esc(e.category)}]` : "";
    lines.push(`${emoji} ${e.date} ${nis(e.amount)}${who}${cat}${note}`);
  }

  return lines.join("\n");
}

// ── Weekly Summary ────────────────────────────

export function formatWeeklySummary(opts: {
  weekLabel: string;
  spendingByCategory: Array<{ name: string; total: number }>;
  weeklyTotal: number;
  balance: number;
  payboxStatus: PayboxStatus;
  payboxTarget: number;
  notableTxs: Array<{ amount: number; name: string; date: string }>;
}): string {
  const lines: string[] = [
    `📊 <b>Daniel's Weekly Summary</b>`,
    `<i>${opts.weekLabel}</i>`,
    "",
    `💸 <b>Spending this week: ${nis(opts.weeklyTotal)}</b>`,
  ];

  for (const cat of opts.spendingByCategory) {
    lines.push(`  ${categoryEmoji(cat.name)} ${esc(cat.name)}: ${nis(cat.total)}`);
  }

  lines.push("");
  lines.push("─────────────────");
  lines.push(`🏦 Bank balance: <b>${nis(opts.balance)}</b>`);

  lines.push("");
  lines.push("─────────────────");
  lines.push(
    `💰 PayBox: ${nis(opts.payboxStatus.totalContributed)} / ${nis(opts.payboxTarget)}`,
  );
  if (opts.payboxStatus.stillNeeded > 0) {
    lines.push(`   Still needed: <b>${nis(opts.payboxStatus.stillNeeded)}</b>`);
  } else {
    lines.push(`   ✅ Target reached!`);
  }

  if (opts.notableTxs.length > 0) {
    lines.push("");
    lines.push("─────────────────");
    lines.push("⚠️ <b>Notable transactions (>₪500):</b>");
    for (const tx of opts.notableTxs) {
      lines.push(`  • ${nis(tx.amount)} — ${esc(tx.name)} <i>(${tx.date})</i>`);
    }
  }

  return lines.join("\n");
}

// ── PayBox contribution confirmation ──────────

export function formatContributionConfirm(
  who: string,
  amount: number,
  status: PayboxStatus,
): string {
  const name = who.charAt(0).toUpperCase() + who.slice(1);
  return `✅ Logged ${nis(amount)} contribution from <b>${name}</b>.\nBox balance: <b>${nis(status.balance)}</b> | Still needed: ${nis(status.stillNeeded)}`;
}

export function formatPaymentConfirm(
  amount: number,
  category: string,
  status: PayboxStatus,
): string {
  return `✅ Logged ${nis(amount)} payment for <b>${esc(category)}</b>.\nRemaining balance: <b>${nis(status.balance)}</b>`;
}

// ── PayBox not set up ─────────────────────────

export { PayboxData };

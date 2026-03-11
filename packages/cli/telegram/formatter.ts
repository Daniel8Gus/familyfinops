import type {
  SpendingGroup,
  HouseholdBalanceData,
  HouseholdReportData,
} from "../src/commands/household.js";

// ── Helpers ───────────────────────────────────

/** Escape characters that have special meaning in Telegram HTML mode. */
function esc(text: string | number): string {
  return String(text)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

/** Format a shekel amount without chalk ANSI codes. */
function nis(amount: number): string {
  const formatted = new Intl.NumberFormat("he-IL", {
    style: "currency",
    currency: "ILS",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  })
    .format(amount)
    .replace(/[\u200E\u200F\u202A-\u202E\u00A0\u2009]/g, "")
    .replace(/\u2212/g, "-")
    .replace(/\s/g, "");
  return formatted;
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
    "(uncategorized)": "📋",
  };
  return map[name] ?? "💳";
}

// ── Formatters ────────────────────────────────

/**
 * Format household spending data as a Telegram HTML message.
 *
 * Example output:
 *   📊 <b>Household Spending — March 2026</b>
 *   🛒 Groceries: ₪1,240 (Daniel ₪680 | Shelly ₪560)
 *   ─────────────
 *   💰 <b>Total: ₪8,340</b>
 */
export function formatSpending(
  data: SpendingGroup[],
  month?: string,
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

  return lines.join("\n");
}

/**
 * Format household balance data as a Telegram HTML message.
 */
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

/**
 * Format a full household report as a Telegram HTML message.
 */
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
    lines.push(`  <i>…and ${data.spending.breakdown.length - 10} more categories</i>`);
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

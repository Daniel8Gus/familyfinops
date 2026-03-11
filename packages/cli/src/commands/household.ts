import chalk from "chalk";
import type { Command } from "commander";
import { RiseUpClient } from "../client/RiseUpClient.js";
import { SessionManager } from "../auth/SessionManager.js";
import { getSessionPath } from "../utils/config.js";
import { parseMonth } from "../utils/dates.js";
import { formatNIS } from "../formatters/currency.js";
import { createTable, printTable } from "../formatters/table.js";
import { printJson } from "../formatters/json.js";
import { fetchBudgetTransactions } from "./budget-helpers.js";
import type { Balance, Transaction } from "../client/types.js";

// ── Constants ─────────────────────────────────

const PROFILES = ["daniel", "shelly"] as const;
type Profile = (typeof PROFILES)[number];

// ── Exported data types ───────────────────────

export interface SpendingGroup {
  name: string;
  total: number;
  count: number;
  daniel: number;
  shelly: number;
}

export interface HouseholdBalanceData {
  daniel: Balance[];
  shelly: Balance[];
  combined_total: number;
}

export interface HouseholdReportData {
  month: string;
  spending: {
    total: number;
    breakdown: SpendingGroup[];
  };
  balances: HouseholdBalanceData;
}

// ── Helpers ───────────────────────────────────

/**
 * Attempt to build a RiseUpClient for the given profile.
 * Returns null (with a warning) if no session exists for that profile.
 */
async function buildClient(profile: Profile): Promise<RiseUpClient | null> {
  const session = new SessionManager(getSessionPath(profile));
  const stored = await session.load();
  if (!stored) {
    console.error(
      chalk.yellow(
        `Warning: no session for profile "${profile}". Run \`riseup login --profile ${profile}\` to authenticate.`,
      ),
    );
    return null;
  }
  return new RiseUpClient({ sessionManager: session });
}

function groupByCategory(
  transactions: Transaction[],
  profile: Profile,
  groups: Map<string, SpendingGroup>,
): void {
  for (const tx of transactions) {
    if (tx.isIncome) continue;
    const key = tx.expense || "(uncategorized)";
    const amount = Math.abs(tx.billingAmount ?? 0);
    const existing = groups.get(key);
    if (existing) {
      existing.total += amount;
      existing.count += 1;
      existing[profile] += amount;
    } else {
      groups.set(key, {
        name: key,
        total: amount,
        count: 1,
        daniel: profile === "daniel" ? amount : 0,
        shelly: profile === "shelly" ? amount : 0,
      });
    }
  }
}

// ── Exported data functions (for programmatic use) ────────────────────────────

/**
 * Fetch combined household spending for both profiles.
 * Throws if neither profile has an active session.
 */
export async function fetchHouseholdSpendingData(
  month?: string,
): Promise<SpendingGroup[]> {
  const date = parseMonth(month);
  const [danielClient, shellyClient] = await Promise.all([
    buildClient("daniel"),
    buildClient("shelly"),
  ]);

  if (!danielClient && !shellyClient) {
    throw new Error("No sessions found for any household profile.");
  }

  const [danielResult, shellyResult] = await Promise.all([
    danielClient ? fetchBudgetTransactions(danielClient, date) : null,
    shellyClient ? fetchBudgetTransactions(shellyClient, date) : null,
  ]);

  const groups = new Map<string, SpendingGroup>();
  if (danielResult) groupByCategory(danielResult.transactions, "daniel", groups);
  if (shellyResult) groupByCategory(shellyResult.transactions, "shelly", groups);

  return Array.from(groups.values()).sort((a, b) => b.total - a.total);
}

/**
 * Fetch combined household balances for both profiles.
 * Throws if neither profile has an active session.
 */
export async function fetchHouseholdBalanceData(): Promise<HouseholdBalanceData> {
  const [danielClient, shellyClient] = await Promise.all([
    buildClient("daniel"),
    buildClient("shelly"),
  ]);

  if (!danielClient && !shellyClient) {
    throw new Error("No sessions found for any household profile.");
  }

  const [danielBalances, shellyBalances] = await Promise.all([
    danielClient ? danielClient.account.balances() : [],
    shellyClient ? shellyClient.account.balances() : [],
  ]);

  const danielTotal = danielBalances.reduce((sum, b) => sum + b.balance, 0);
  const shellyTotal = shellyBalances.reduce((sum, b) => sum + b.balance, 0);

  return {
    daniel: danielBalances,
    shelly: shellyBalances,
    combined_total: danielTotal + shellyTotal,
  };
}

/**
 * Fetch a full household report (spending + balances) for both profiles.
 * Throws if neither profile has an active session.
 */
export async function fetchHouseholdReportData(
  month?: string,
): Promise<HouseholdReportData> {
  const date = parseMonth(month);
  const [danielClient, shellyClient] = await Promise.all([
    buildClient("daniel"),
    buildClient("shelly"),
  ]);

  if (!danielClient && !shellyClient) {
    throw new Error("No sessions found for any household profile.");
  }

  const [danielResult, shellyResult, danielBalances, shellyBalances] =
    await Promise.all([
      danielClient ? fetchBudgetTransactions(danielClient, date) : null,
      shellyClient ? fetchBudgetTransactions(shellyClient, date) : null,
      danielClient ? danielClient.account.balances() : [],
      shellyClient ? shellyClient.account.balances() : [],
    ]);

  const groups = new Map<string, SpendingGroup>();
  if (danielResult) groupByCategory(danielResult.transactions, "daniel", groups);
  if (shellyResult) groupByCategory(shellyResult.transactions, "shelly", groups);
  const breakdown = Array.from(groups.values()).sort((a, b) => b.total - a.total);

  const danielBalanceTotal = danielBalances.reduce((sum, b) => sum + b.balance, 0);
  const shellyBalanceTotal = shellyBalances.reduce((sum, b) => sum + b.balance, 0);

  return {
    month: date,
    spending: {
      total: breakdown.reduce((sum, g) => sum + g.total, 0),
      breakdown,
    },
    balances: {
      daniel: danielBalances,
      shelly: shellyBalances,
      combined_total: danielBalanceTotal + shellyBalanceTotal,
    },
  };
}

// ── CLI action functions ───────────────────────

export async function householdSpendingAction(
  month: string | undefined,
  _options: Record<string, unknown>,
  command: Command,
): Promise<void> {
  const opts = command.optsWithGlobals();
  const json = Boolean(opts.json);
  const date = parseMonth(month);

  const [danielClient, shellyClient] = await Promise.all([
    buildClient("daniel"),
    buildClient("shelly"),
  ]);

  if (!danielClient && !shellyClient) {
    const msg = "No sessions found for any household profile.";
    if (json) {
      console.log(JSON.stringify({ error: msg }));
    } else {
      console.error(chalk.red(msg));
    }
    process.exitCode = 1;
    return;
  }

  const [danielResult, shellyResult] = await Promise.all([
    danielClient ? fetchBudgetTransactions(danielClient, date) : null,
    shellyClient ? fetchBudgetTransactions(shellyClient, date) : null,
  ]);

  const groups = new Map<string, SpendingGroup>();
  if (danielResult) groupByCategory(danielResult.transactions, "daniel", groups);
  if (shellyResult) groupByCategory(shellyResult.transactions, "shelly", groups);

  const sorted = Array.from(groups.values()).sort((a, b) => b.total - a.total);

  if (json) {
    printJson(sorted);
    return;
  }

  const table = createTable({ head: ["Category", "Daniel", "Shelly", "Total"] });
  for (const g of sorted) {
    table.push([
      g.name,
      g.daniel > 0 ? formatNIS(g.daniel) : "-",
      g.shelly > 0 ? formatNIS(g.shelly) : "-",
      formatNIS(g.total),
    ]);
  }

  console.log(chalk.bold(`Household Spending for ${date}`));
  printTable(table);

  const grandTotal = sorted.reduce((sum, g) => sum + g.total, 0);
  console.log(chalk.bold(`\nTotal: ${formatNIS(grandTotal)}`));
}

export async function householdBalanceAction(
  _options: Record<string, unknown>,
  command: Command,
): Promise<void> {
  const opts = command.optsWithGlobals();
  const json = Boolean(opts.json);

  const [danielClient, shellyClient] = await Promise.all([
    buildClient("daniel"),
    buildClient("shelly"),
  ]);

  if (!danielClient && !shellyClient) {
    const msg = "No sessions found for any household profile.";
    if (json) {
      console.log(JSON.stringify({ error: msg }));
    } else {
      console.error(chalk.red(msg));
    }
    process.exitCode = 1;
    return;
  }

  const [danielBalances, shellyBalances] = await Promise.all([
    danielClient ? danielClient.account.balances() : [],
    shellyClient ? shellyClient.account.balances() : [],
  ]);

  const danielTotal = danielBalances.reduce((sum, b) => sum + b.balance, 0);
  const shellyTotal = shellyBalances.reduce((sum, b) => sum + b.balance, 0);
  const combinedTotal = danielTotal + shellyTotal;

  if (json) {
    printJson({ daniel: danielBalances, shelly: shellyBalances, combined_total: combinedTotal });
    return;
  }

  if (danielBalances.length > 0) {
    const table = createTable({ head: ["Account", "Source", "Balance"] });
    for (const b of danielBalances) {
      table.push([b.accountNumberPiiValue ?? b.accountNumberPiiId, b.source, formatNIS(b.balance)]);
    }
    console.log(chalk.bold("Daniel's Accounts"));
    printTable(table);
    console.log(chalk.bold(`Total: ${formatNIS(danielTotal)}\n`));
  }

  if (shellyBalances.length > 0) {
    const table = createTable({ head: ["Account", "Source", "Balance"] });
    for (const b of shellyBalances) {
      table.push([b.accountNumberPiiValue ?? b.accountNumberPiiId, b.source, formatNIS(b.balance)]);
    }
    console.log(chalk.bold("Shelly's Accounts"));
    printTable(table);
    console.log(chalk.bold(`Total: ${formatNIS(shellyTotal)}\n`));
  }

  console.log(chalk.bold(`Combined Total: ${formatNIS(combinedTotal)}`));
}

export async function householdReportAction(
  month: string | undefined,
  _options: Record<string, unknown>,
  command: Command,
): Promise<void> {
  const opts = command.optsWithGlobals();
  const json = Boolean(opts.json);
  const date = parseMonth(month);

  const [danielClient, shellyClient] = await Promise.all([
    buildClient("daniel"),
    buildClient("shelly"),
  ]);

  if (!danielClient && !shellyClient) {
    const msg = "No sessions found for any household profile.";
    if (json) {
      console.log(JSON.stringify({ error: msg }));
    } else {
      console.error(chalk.red(msg));
    }
    process.exitCode = 1;
    return;
  }

  const [danielResult, shellyResult, danielBalances, shellyBalances] =
    await Promise.all([
      danielClient ? fetchBudgetTransactions(danielClient, date) : null,
      shellyClient ? fetchBudgetTransactions(shellyClient, date) : null,
      danielClient ? danielClient.account.balances() : [],
      shellyClient ? shellyClient.account.balances() : [],
    ]);

  const groups = new Map<string, SpendingGroup>();
  if (danielResult) groupByCategory(danielResult.transactions, "daniel", groups);
  if (shellyResult) groupByCategory(shellyResult.transactions, "shelly", groups);
  const sortedSpending = Array.from(groups.values()).sort((a, b) => b.total - a.total);

  const danielBalanceTotal = danielBalances.reduce((sum, b) => sum + b.balance, 0);
  const shellyBalanceTotal = shellyBalances.reduce((sum, b) => sum + b.balance, 0);
  const combinedBalanceTotal = danielBalanceTotal + shellyBalanceTotal;
  const totalSpending = sortedSpending.reduce((sum, g) => sum + g.total, 0);

  if (json) {
    printJson({
      month: date,
      spending: { total: totalSpending, breakdown: sortedSpending },
      balances: { daniel: danielBalances, shelly: shellyBalances, combined_total: combinedBalanceTotal },
    });
    return;
  }

  console.log(chalk.bold.cyan(`\n=== Household Report: ${date} ===\n`));
  console.log(chalk.bold(`Total Household Spending: ${formatNIS(totalSpending)}`));

  if (sortedSpending.length > 0) {
    const spendTable = createTable({ head: ["Category", "Daniel", "Shelly", "Total"] });
    for (const g of sortedSpending) {
      spendTable.push([
        g.name,
        g.daniel > 0 ? formatNIS(g.daniel) : "-",
        g.shelly > 0 ? formatNIS(g.shelly) : "-",
        formatNIS(g.total),
      ]);
    }
    console.log(chalk.bold("\nSpending by Category"));
    printTable(spendTable);
  }

  console.log(chalk.bold("\nAccount Balances"));
  const balanceTable = createTable({ head: ["Profile", "Total Balance"] });
  if (danielBalances.length > 0) balanceTable.push(["Daniel", formatNIS(danielBalanceTotal)]);
  if (shellyBalances.length > 0) balanceTable.push(["Shelly", formatNIS(shellyBalanceTotal)]);
  balanceTable.push([chalk.bold("Combined"), chalk.bold(formatNIS(combinedBalanceTotal))]);
  printTable(balanceTable);
}

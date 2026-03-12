import chalk from "chalk";
import type { Command } from "commander";
import { RiseUpClient } from "../client/RiseUpClient.js";
import { SessionManager } from "../auth/SessionManager.js";
import { getSessionPath } from "../utils/config.js";
import { parseMonth, offsetMonth } from "../utils/dates.js";
import { formatNIS } from "../formatters/currency.js";
import { createTable, printTable } from "../formatters/table.js";
import { printJson } from "../formatters/json.js";
import { fetchBudgetTransactions } from "./budget-helpers.js";
import { loadPaybox } from "../data/paybox.js";
import type { Balance, Transaction } from "../client/types.js";

// ── Constants ─────────────────────────────────

const PROFILES = ["daniel", "shelly"] as const;
type Profile = (typeof PROFILES)[number];

type TxForFilter = Transaction & { description?: string; amount?: number };

const isCreditCardBillPayment = (tx: TxForFilter): boolean => {
  const name = (tx.businessName || tx.description || "").toLowerCase();
  const rawAmount = tx.billingAmount ?? tx.amount ?? tx.incomeAmount ?? 0;
  const amount = Math.abs(rawAmount);
  const isCCMerchant =
    name.includes("ישראכרט") ||
    name.includes("ויזה מקס") ||
    name.includes("מקס איט") ||
    name.includes("visa max") ||
    name.includes("max it");
  // Only exclude large monthly bill payments (typically ₪5,000+), not individual card purchases
  return isCCMerchant && amount > 5000;
};

const isBankTransfer = (tx: TxForFilter): boolean => {
  const name = (tx.businessName || tx.description || "").toLowerCase();
  const rawAmount = tx.billingAmount ?? tx.amount ?? tx.incomeAmount ?? 0;
  const amount = Math.abs(rawAmount);
  return name.includes("העברה") && amount > 3000;
};

const isRealExpense = (tx: TxForFilter): boolean => {
  if (tx.isIncome) return false;
  if (isCreditCardBillPayment(tx)) return false;
  if (isBankTransfer(tx)) return false;
  return true;
};

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
    if (!isRealExpense(tx)) continue;
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

/**
 * Fetch raw transactions for Daniel's account for a given month.
 * Returns [] if no session or no budget found.
 */
export async function fetchDanielTransactions(month?: string): Promise<Transaction[]> {
  const date = parseMonth(month);
  const danielClient = await buildClient("daniel");
  if (!danielClient) return [];
  const result = await fetchBudgetTransactions(danielClient, date);
  return result?.transactions ?? [];
}

export interface MonthTrend {
  month: string;
  income: number;
  expenses: number;
  net: number;
}

/** Return true if transaction belongs to the given month (YYYY-MM). Uses transactionBudgetDate or calendarMonth first (budget-assigned), then transactionDate. */
function isTransactionInMonth(tx: Transaction, month: string): boolean {
  if ((tx.transactionBudgetDate ?? "").startsWith(month)) return true;
  if ((tx.calendarMonth ?? "").startsWith(month)) return true;
  return (tx.transactionDate ?? "").startsWith(month);
}

/** Private helper: fetch trends for any profile. Fetches each month separately, dedupes transactions by id, then assigns each transaction to its actual month so Oct and Nov are not duplicated. */
async function _fetchTrends(profile: Profile, months: number): Promise<MonthTrend[]> {
  const client = await buildClient(profile);
  if (!client) return [];
  const monthList: string[] = [];
  for (let i = 0; i < months; i++) monthList.push(offsetMonth(-i));
  monthList.reverse();

  const seenIds = new Set<string>();
  const allTxs: Transaction[] = [];
  for (const month of monthList) {
    const result = await fetchBudgetTransactions(client, month);
    if (!result) continue;
    for (const tx of result.transactions) {
      const id = tx.transactionId ?? `${tx.transactionDate}-${tx.businessName}-${tx.billingAmount}`;
      if (seenIds.has(id)) continue;
      seenIds.add(id);
      allTxs.push(tx);
    }
  }

  return monthList.map((month) => {
    const txs = allTxs.filter((t) => isTransactionInMonth(t, month));
    const income = txs.filter((t) => t.isIncome).reduce((s, t) => s + (t.incomeAmount ?? 0), 0);
    const expenses = txs
      .filter((t) => isRealExpense(t))
      .reduce((s, t) => {
        const rawAmount = t.billingAmount ?? (t as TxForFilter).amount ?? t.incomeAmount ?? 0;
        return s + Math.abs(rawAmount);
      }, 0);
    return { month, income, expenses, net: income - expenses };
  });
}

/**
 * Fetch monthly income/expense trends for Daniel's account.
 */
export async function fetchDanielTrends(months = 6): Promise<MonthTrend[]> {
  return _fetchTrends("daniel", months);
}

/**
 * Fetch monthly income/expense trends for Shelly's account.
 */
export async function fetchShellyTrends(months = 6): Promise<MonthTrend[]> {
  return _fetchTrends("shelly", months);
}

/**
 * Fetch raw transactions for Shelly's account for a given month.
 */
export async function fetchShellyTransactions(month?: string): Promise<Transaction[]> {
  const date = parseMonth(month);
  const shellyClient = await buildClient("shelly");
  if (!shellyClient) return [];
  const result = await fetchBudgetTransactions(shellyClient, date);
  return result?.transactions ?? [];
}

/**
 * Fetch combined household transactions (Daniel + Shelly) for a given month.
 * Sorted by date descending.
 */
export async function fetchHouseholdTransactions(month?: string): Promise<Transaction[]> {
  const [danielTxs, shellyTxs] = await Promise.all([
    fetchDanielTransactions(month),
    fetchShellyTransactions(month),
  ]);
  const combined = [...danielTxs, ...shellyTxs];
  combined.sort(
    (a, b) => new Date(b.transactionDate).getTime() - new Date(a.transactionDate).getTime(),
  );
  return combined;
}

/**
 * Fetch spending breakdown for Daniel's account for a given month.
 * Credit card batch payments are excluded automatically via groupByCategory.
 */
export async function fetchDanielSpendingData(month?: string): Promise<SpendingGroup[]> {
  const date = parseMonth(month);
  const danielClient = await buildClient("daniel");
  if (!danielClient) return [];
  const result = await fetchBudgetTransactions(danielClient, date);
  if (!result) return [];
  const groups = new Map<string, SpendingGroup>();
  groupByCategory(result.transactions, "daniel", groups);
  return Array.from(groups.values()).sort((a, b) => b.total - a.total);
}

/**
 * Fetch spending breakdown for Shelly's account for a given month.
 */
export async function fetchShellySpendingData(month?: string): Promise<SpendingGroup[]> {
  const date = parseMonth(month);
  const shellyClient = await buildClient("shelly");
  if (!shellyClient) return [];
  const result = await fetchBudgetTransactions(shellyClient, date);
  if (!result) return [];
  const groups = new Map<string, SpendingGroup>();
  groupByCategory(result.transactions, "shelly", groups);
  return Array.from(groups.values()).sort((a, b) => b.total - a.total);
}

// ── Investment types + fetch ──────────────────

export interface InvestmentPosition {
  name: string;
  units: number;
  avgBuyPrice: number;
  fundType: string;
}

export interface InvestmentAccount {
  id: string;
  name: string;
  product: string;
  owner: "daniel" | "shelly";
  source: string;
  totalValue: number;
  lastUpdated: string;
  positions: InvestmentPosition[];
}

/**
 * Fetch all investment/securities accounts for both profiles.
 */
export async function fetchInvestments(): Promise<InvestmentAccount[]> {
  const [danielClient, shellyClient] = await Promise.all([
    buildClient("daniel"),
    buildClient("shelly"),
  ]);

  const accounts: InvestmentAccount[] = [];

  async function addFromProfile(
    client: RiseUpClient | null,
    owner: Profile,
  ): Promise<void> {
    if (!client) return;
    try {
      const summary = await client.account.financialSummary();
      for (const sec of summary.securities) {
        // The actual API returns more fields than the TS type captures — cast safely
        const raw = sec as unknown as {
          resourceId: string;
          name: string;
          product?: string;
          sourceIdentifier: string;
          balanceAmount: { amount: string };
          balances: Array<{ referenceDateTime: string }>;
          positions: Array<{
            unitsNumber: number;
            averageBuyingPrice: { amount: string };
            financialInstrument: {
              name: string;
              other?: { typeProprietary?: string };
            };
          }>;
        };

        accounts.push({
          id: raw.resourceId,
          name: raw.name,
          product: raw.product ?? "תיק אחזקות",
          owner,
          source: raw.sourceIdentifier,
          totalValue: parseFloat(raw.balanceAmount.amount),
          lastUpdated: raw.balances[0]?.referenceDateTime ?? "",
          positions: raw.positions.map((p) => ({
            name: p.financialInstrument.name,
            units: p.unitsNumber,
            avgBuyPrice: parseFloat(p.averageBuyingPrice.amount),
            fundType: p.financialInstrument.other?.typeProprietary ?? "",
          })),
        });
      }
    } catch {
      // Non-critical — skip if financial summary unavailable for this profile
    }
  }

  await Promise.all([
    addFromProfile(danielClient, "daniel"),
    addFromProfile(shellyClient, "shelly"),
  ]);

  return accounts;
}

/**
 * Fetch MUTUAL household expenses only: fixed rent + PayBox payments.
 * This is the correct "household spending" — NOT personal bank transactions.
 */
export async function fetchHouseholdMutualExpenses(month?: string): Promise<SpendingGroup[]> {
  const currentMonth = parseMonth(month);
  const groups: SpendingGroup[] = [];

  // Fixed: Rent (₪6,000/month, split 50/50 as placeholder)
  groups.push({ name: "שכירות", total: 6000, count: 1, daniel: 3000, shelly: 3000 });

  // Variable: PayBox payments logged this month
  try {
    const payboxData = await loadPaybox();
    const monthPayments = payboxData.payments.filter((p) => p.date.startsWith(currentMonth));
    const byCategory = new Map<string, SpendingGroup>();
    for (const p of monthPayments) {
      const cat = p.category || "כללי";
      const cur = byCategory.get(cat) ?? { name: cat, total: 0, count: 0, daniel: 0, shelly: 0 };
      cur.total += p.amount;
      cur.count += 1;
      if (p.logged_by === "daniel") cur.daniel += p.amount;
      else if (p.logged_by === "shelly") cur.shelly += p.amount;
      byCategory.set(cat, cur);
    }
    for (const g of byCategory.values()) groups.push(g);
  } catch {
    // PayBox unavailable — return just rent
  }

  return groups.sort((a, b) => b.total - a.total);
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

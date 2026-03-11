import cron from "node-cron";
import type { Telegraf } from "telegraf";
import { getConfig } from "./config.js";
import { formatBalance, formatReport, formatWeeklySummary } from "./formatter.js";
import {
  fetchHouseholdBalanceData,
  fetchHouseholdReportData,
  fetchDanielTransactions,
} from "../src/commands/household.js";
import { loadPaybox, calcStatus } from "../src/data/paybox.js";

export function startScheduler(bot: Telegraf): void {
  const { chatId } = getConfig();

  // Daily balance at 09:00
  cron.schedule("0 9 * * *", async () => {
    try {
      const data = await fetchHouseholdBalanceData();
      await bot.telegram.sendMessage(chatId, formatBalance(data), { parse_mode: "HTML" });
    } catch (err) {
      await bot.telegram.sendMessage(chatId, `❌ Scheduled balance failed: ${err instanceof Error ? err.message : String(err)}`);
    }
  });

  // Monthly report on the 1st at 08:00
  cron.schedule("0 8 1 * *", async () => {
    try {
      const data = await fetchHouseholdReportData();
      await bot.telegram.sendMessage(chatId, formatReport(data), { parse_mode: "HTML" });
    } catch (err) {
      await bot.telegram.sendMessage(chatId, `❌ Scheduled report failed: ${err instanceof Error ? err.message : String(err)}`);
    }
  });

  // Daniel's weekly summary every Sunday at 09:00
  cron.schedule("0 9 * * 0", async () => {
    try {
      const now = new Date();
      const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      const cutoff = sevenDaysAgo.toISOString().slice(0, 10);

      const [txs, balanceData, payboxData] = await Promise.all([
        fetchDanielTransactions(),
        fetchHouseholdBalanceData(),
        loadPaybox(),
      ]);

      // Filter to last 7 days of expenses
      const weekExpenses = txs.filter(
        (t) => !t.isIncome && t.transactionDate >= cutoff,
      );

      // Group by category
      const byCategory = new Map<string, number>();
      for (const t of weekExpenses) {
        const cat = t.expense || "(uncategorized)";
        byCategory.set(cat, (byCategory.get(cat) ?? 0) + Math.abs(t.billingAmount ?? 0));
      }
      const spendingByCategory = Array.from(byCategory.entries())
        .map(([name, total]) => ({ name, total }))
        .sort((a, b) => b.total - a.total);

      const weeklyTotal = spendingByCategory.reduce((s, c) => s + c.total, 0);

      // Notable transactions (> ₪500)
      const notableTxs = weekExpenses
        .map((t) => ({
          amount: Math.abs(t.billingAmount ?? 0),
          name: t.businessName,
          date: t.transactionDate,
        }))
        .filter((t) => t.amount >= 500)
        .sort((a, b) => b.amount - a.amount);

      const danielBalance = balanceData.daniel.reduce((s, b) => s + b.balance, 0);
      const payboxStatus = calcStatus(payboxData);

      const weekLabel = `${sevenDaysAgo.toLocaleDateString("en-IL", { month: "short", day: "numeric" })} – ${now.toLocaleDateString("en-IL", { month: "short", day: "numeric", year: "numeric" })}`;

      const text = formatWeeklySummary({
        weekLabel,
        spendingByCategory,
        weeklyTotal,
        balance: danielBalance,
        payboxStatus,
        payboxTarget: payboxData.monthly_target,
        notableTxs,
      });

      await bot.telegram.sendMessage(chatId, text, { parse_mode: "HTML" });
    } catch (err) {
      await bot.telegram.sendMessage(chatId, `❌ Weekly summary failed: ${err instanceof Error ? err.message : String(err)}`);
    }
  });
}

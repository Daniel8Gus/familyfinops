import Anthropic from "@anthropic-ai/sdk";
import { Telegraf } from "telegraf";
import { getConfig, USERS } from "./config.js";
import {
  formatSpending,
  formatBalance,
  formatReport,
  formatPayboxStatus,
  formatPayboxHistory,
  formatContributionConfirm,
  formatPaymentConfirm,
} from "./formatter.js";
import {
  fetchHouseholdSpendingData,
  fetchHouseholdBalanceData,
  fetchHouseholdReportData,
  fetchDanielTransactions,
} from "../src/commands/household.js";
import {
  loadPaybox,
  addContribution,
  addPayment,
  calcStatus,
  getHistory,
} from "../src/data/paybox.js";
import { parseMonth } from "../src/utils/dates.js";

// ── Helpers ───────────────────────────────────

function resolveProfile(userId: number | undefined): "daniel" | "shelly" | null {
  if (!userId) return null;
  return USERS[userId] ?? null;
}

function analyzeTransactions(txs: Awaited<ReturnType<typeof fetchDanielTransactions>>) {
  const expenses = txs.filter((t) => !t.isIncome);

  const byMerchant = new Map<string, number>();
  for (const t of expenses) {
    const name = t.businessName || "(unknown)";
    byMerchant.set(name, (byMerchant.get(name) ?? 0) + Math.abs(t.billingAmount ?? 0));
  }
  const topMerchants = Array.from(byMerchant.entries())
    .map(([name, total]) => ({ name, total }))
    .sort((a, b) => b.total - a.total)
    .slice(0, 3);

  const biggest = expenses
    .map((t) => ({
      amount: Math.abs(t.billingAmount ?? 0),
      name: t.businessName,
      date: t.transactionDate,
    }))
    .sort((a, b) => b.amount - a.amount)[0] ?? null;

  return { topMerchants, biggestTx: biggest };
}

async function askClaude(question: string, financialData: object): Promise<string> {
  const apiKey = process.env["ANTHROPIC_API_KEY"];
  if (!apiKey) {
    return "🤖 AI queries are not enabled. Add ANTHROPIC_API_KEY to telegram/.env to activate.";
  }
  const client = new Anthropic({ apiKey });
  const response = await client.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 500,
    messages: [
      {
        role: "user",
        content: `You are a personal finance assistant for an Israeli household.
Here is the financial data: ${JSON.stringify(financialData)}
Question: ${question}
Answer concisely (2-4 sentences max) in the same language as the question.
Use ₪ for amounts. Be direct and helpful.`,
      },
    ],
  });
  const block = response.content[0];
  return block.type === "text" ? block.text : "Could not generate a response.";
}

// ── Bot factory ───────────────────────────────

export function createBot(): Telegraf {
  const { botToken } = getConfig();
  const bot = new Telegraf(botToken);

  // ── /balance ──────────────────────────────────
  bot.command("balance", async (ctx) => {
    const msg = await ctx.reply("⏳ Fetching balances…");
    try {
      const data = await fetchHouseholdBalanceData();
      await ctx.telegram.editMessageText(ctx.chat.id, msg.message_id, undefined, formatBalance(data), { parse_mode: "HTML" });
    } catch (err) {
      await ctx.telegram.editMessageText(ctx.chat.id, msg.message_id, undefined, `❌ Error: ${err instanceof Error ? err.message : String(err)}`);
    }
  });

  // ── /spending [month] ────────────────────────
  bot.command("spending", async (ctx) => {
    const parts = ctx.message.text.split(/\s+/);
    const month = parts[1];
    const msg = await ctx.reply("⏳ Fetching spending…");
    try {
      const currentMonthStr = parseMonth(month);
      const lastMonthDate = new Date();
      lastMonthDate.setMonth(lastMonthDate.getMonth() - 1);
      const lastMonthStr = lastMonthDate.toISOString().slice(0, 7);

      const [data, lastMonthData, txs] = await Promise.all([
        fetchHouseholdSpendingData(month),
        fetchHouseholdSpendingData(lastMonthStr).catch(() => []),
        fetchDanielTransactions(currentMonthStr),
      ]);

      const lastMonthTotal = lastMonthData.reduce((s, g) => s + g.total, 0);
      const { topMerchants, biggestTx } = analyzeTransactions(txs);

      await ctx.telegram.editMessageText(
        ctx.chat.id, msg.message_id, undefined,
        formatSpending(data, month, { topMerchants, biggestTx, lastMonthTotal }),
        { parse_mode: "HTML" },
      );
    } catch (err) {
      await ctx.telegram.editMessageText(ctx.chat.id, msg.message_id, undefined, `❌ Error: ${err instanceof Error ? err.message : String(err)}`);
    }
  });

  // ── /report [month] ───────────────────────────
  bot.command("report", async (ctx) => {
    const parts = ctx.message.text.split(/\s+/);
    const month = parts[1];
    const msg = await ctx.reply("⏳ Generating report…");
    try {
      const data = await fetchHouseholdReportData(month);
      await ctx.telegram.editMessageText(ctx.chat.id, msg.message_id, undefined, formatReport(data), { parse_mode: "HTML" });
    } catch (err) {
      await ctx.telegram.editMessageText(ctx.chat.id, msg.message_id, undefined, `❌ Error: ${err instanceof Error ? err.message : String(err)}`);
    }
  });

  // ── /paybox [history] ────────────────────────
  bot.command("paybox", async (ctx) => {
    const args = ctx.message.text.split(/\s+/).slice(1);

    if (args[0] === "history") {
      const msg = await ctx.reply("⏳ Loading history…");
      try {
        const history = await getHistory(10);
        await ctx.telegram.editMessageText(ctx.chat.id, msg.message_id, undefined, formatPayboxHistory(history), { parse_mode: "HTML" });
      } catch (err) {
        await ctx.telegram.editMessageText(ctx.chat.id, msg.message_id, undefined, `❌ Error: ${err instanceof Error ? err.message : String(err)}`);
      }
      return;
    }

    const msg = await ctx.reply("⏳ Loading PayBox…");
    try {
      const data = await loadPaybox();
      const status = calcStatus(data);
      await ctx.telegram.editMessageText(ctx.chat.id, msg.message_id, undefined, formatPayboxStatus(status, data.monthly_target), { parse_mode: "HTML" });
    } catch (err) {
      await ctx.telegram.editMessageText(ctx.chat.id, msg.message_id, undefined, `❌ Error: ${err instanceof Error ? err.message : String(err)}`);
    }
  });

  // ── /contribute <amount> [note] ───────────────
  bot.command("contribute", async (ctx) => {
    const profile = resolveProfile(ctx.from?.id);
    if (!profile) {
      await ctx.reply(`❌ Your Telegram ID (${ctx.from?.id}) is not mapped to a profile.\nAsk Daniel to add it in telegram/config.ts.`);
      return;
    }

    const parts = ctx.message.text.split(/\s+/).slice(1);
    const amount = parseFloat(parts[0] ?? "");
    if (isNaN(amount) || amount <= 0) {
      await ctx.reply("❌ Usage: /contribute <amount> [note]\nExample: /contribute 500 March contribution");
      return;
    }
    const note = parts.slice(1).join(" ") || undefined;

    const msg = await ctx.reply("⏳ Logging contribution…");
    try {
      const { status } = await addContribution(profile, amount, ctx.from!.id, note);
      await ctx.telegram.editMessageText(ctx.chat.id, msg.message_id, undefined, formatContributionConfirm(profile, amount, status), { parse_mode: "HTML" });
    } catch (err) {
      await ctx.telegram.editMessageText(ctx.chat.id, msg.message_id, undefined, `❌ Error: ${err instanceof Error ? err.message : String(err)}`);
    }
  });

  // ── /paid <amount> <category> [note] ─────────
  bot.command("paid", async (ctx) => {
    const profile = resolveProfile(ctx.from?.id);
    if (!profile) {
      await ctx.reply(`❌ Your Telegram ID (${ctx.from?.id}) is not mapped to a profile.`);
      return;
    }

    const parts = ctx.message.text.split(/\s+/).slice(1);
    const amount = parseFloat(parts[0] ?? "");
    const category = parts[1];

    if (isNaN(amount) || amount <= 0 || !category) {
      await ctx.reply("❌ Usage: /paid <amount> <category> [note]\nExample: /paid 250 groceries Rami Levy");
      return;
    }
    const note = parts.slice(2).join(" ") || undefined;

    const msg = await ctx.reply("⏳ Logging payment…");
    try {
      const { status } = await addPayment(amount, category, profile, note);
      await ctx.telegram.editMessageText(ctx.chat.id, msg.message_id, undefined, formatPaymentConfirm(amount, category, status), { parse_mode: "HTML" });
    } catch (err) {
      await ctx.telegram.editMessageText(ctx.chat.id, msg.message_id, undefined, `❌ Error: ${err instanceof Error ? err.message : String(err)}`);
    }
  });

  // ── /ask <question> ───────────────────────────
  bot.command("ask", async (ctx) => {
    const question = ctx.message.text.replace(/^\/ask\s*/i, "").trim();
    if (!question) {
      await ctx.reply("❌ Usage: /ask <your question>\nExample: /ask כמה הוצאנו החודש על אוכל?");
      return;
    }

    const msg = await ctx.reply("🤖 Thinking…");
    try {
      const [spending, balance, payboxData] = await Promise.all([
        fetchHouseholdSpendingData().catch(() => []),
        fetchHouseholdBalanceData().catch(() => ({ daniel: [], shelly: [], combined_total: 0 })),
        loadPaybox(),
      ]);
      const payboxStatus = calcStatus(payboxData);
      const answer = await askClaude(question, { spending, balance, paybox: payboxStatus });
      await ctx.telegram.editMessageText(ctx.chat.id, msg.message_id, undefined, answer);
    } catch (err) {
      await ctx.telegram.editMessageText(ctx.chat.id, msg.message_id, undefined, `❌ Error: ${err instanceof Error ? err.message : String(err)}`);
    }
  });

  return bot;
}

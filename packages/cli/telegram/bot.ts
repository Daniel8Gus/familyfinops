import { Telegraf } from "telegraf";
import { getConfig } from "./config.js";
import { formatSpending, formatBalance, formatReport } from "./formatter.js";
import {
  fetchHouseholdSpendingData,
  fetchHouseholdBalanceData,
  fetchHouseholdReportData,
} from "../src/commands/household.js";

export function createBot(): Telegraf {
  const { botToken } = getConfig();
  const bot = new Telegraf(botToken);

  // ── /balance ──────────────────────────────────
  bot.command("balance", async (ctx) => {
    const msg = await ctx.reply("⏳ Fetching balances…");
    try {
      const data = await fetchHouseholdBalanceData();
      const text = formatBalance(data);
      await ctx.telegram.editMessageText(
        ctx.chat.id,
        msg.message_id,
        undefined,
        text,
        { parse_mode: "HTML" },
      );
    } catch (err) {
      await ctx.telegram.editMessageText(
        ctx.chat.id,
        msg.message_id,
        undefined,
        `❌ Error: ${err instanceof Error ? err.message : String(err)}`,
      );
    }
  });

  // ── /spending ─────────────────────────────────
  bot.command("spending", async (ctx) => {
    // Optional month argument: /spending 2026-02
    const parts = ctx.message.text.split(/\s+/);
    const month = parts[1]; // undefined if not provided

    const msg = await ctx.reply("⏳ Fetching spending…");
    try {
      const data = await fetchHouseholdSpendingData(month);
      // Derive the actual date used (parseMonth is called inside the data fn,
      // so we reconstruct the label from the returned data or pass month through).
      const text = formatSpending(data, month);
      await ctx.telegram.editMessageText(
        ctx.chat.id,
        msg.message_id,
        undefined,
        text,
        { parse_mode: "HTML" },
      );
    } catch (err) {
      await ctx.telegram.editMessageText(
        ctx.chat.id,
        msg.message_id,
        undefined,
        `❌ Error: ${err instanceof Error ? err.message : String(err)}`,
      );
    }
  });

  // ── /report ───────────────────────────────────
  bot.command("report", async (ctx) => {
    const parts = ctx.message.text.split(/\s+/);
    const month = parts[1];

    const msg = await ctx.reply("⏳ Generating report…");
    try {
      const data = await fetchHouseholdReportData(month);
      const text = formatReport(data);
      await ctx.telegram.editMessageText(
        ctx.chat.id,
        msg.message_id,
        undefined,
        text,
        { parse_mode: "HTML" },
      );
    } catch (err) {
      await ctx.telegram.editMessageText(
        ctx.chat.id,
        msg.message_id,
        undefined,
        `❌ Error: ${err instanceof Error ? err.message : String(err)}`,
      );
    }
  });

  // ── /paybox ───────────────────────────────────
  bot.command("paybox", async (ctx) => {
    await ctx.reply("💸 PayBox tracker coming soon.");
  });

  // ── /ask ──────────────────────────────────────
  bot.command("ask", async (ctx) => {
    await ctx.reply("🤖 AI queries coming soon.");
  });

  return bot;
}

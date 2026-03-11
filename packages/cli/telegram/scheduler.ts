import cron from "node-cron";
import type { Telegraf } from "telegraf";
import { getConfig } from "./config.js";
import { formatBalance, formatReport } from "./formatter.js";
import {
  fetchHouseholdBalanceData,
  fetchHouseholdReportData,
} from "../src/commands/household.js";

/**
 * Start scheduled household finance notifications.
 *
 * Schedule:
 *   - Daily at 09:00  → balance summary
 *   - 1st of month at 08:00 → full monthly report
 */
export function startScheduler(bot: Telegraf): void {
  const { chatId } = getConfig();

  // Daily balance at 09:00
  cron.schedule("0 9 * * *", async () => {
    try {
      const data = await fetchHouseholdBalanceData();
      const text = formatBalance(data);
      await bot.telegram.sendMessage(chatId, text, { parse_mode: "HTML" });
    } catch (err) {
      await bot.telegram.sendMessage(
        chatId,
        `❌ Scheduled balance failed: ${err instanceof Error ? err.message : String(err)}`,
      );
    }
  });

  // Monthly report on the 1st at 08:00
  cron.schedule("0 8 1 * *", async () => {
    try {
      const data = await fetchHouseholdReportData();
      const text = formatReport(data);
      await bot.telegram.sendMessage(chatId, text, { parse_mode: "HTML" });
    } catch (err) {
      await bot.telegram.sendMessage(
        chatId,
        `❌ Scheduled report failed: ${err instanceof Error ? err.message : String(err)}`,
      );
    }
  });
}

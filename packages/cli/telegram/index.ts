/**
 * Telegram bot entry point.
 *
 * Usage:
 *   npx tsx telegram/index.ts
 *
 * Environment variables (put in telegram/.env or export directly):
 *   TELEGRAM_BOT_TOKEN  — from @BotFather
 *   TELEGRAM_CHAT_ID    — your group or personal chat ID
 */

import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { createBot } from "./bot.js";
import { startScheduler } from "./scheduler.js";

// Load telegram/.env if it exists (Node >= 20.12 built-in)
const __dirname = fileURLToPath(new URL(".", import.meta.url));
try {
  process.loadEnvFile(resolve(__dirname, ".env"));
} catch {
  // .env not present — rely on environment variables set externally
}

const bot = createBot();
startScheduler(bot);

bot.launch();

// Graceful shutdown
process.once("SIGINT", () => bot.stop("SIGINT"));
process.once("SIGTERM", () => bot.stop("SIGTERM"));

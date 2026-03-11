/**
 * Telegram bot + API server entry point.
 *
 * Usage:
 *   npx tsx telegram/index.ts
 *   npm run bot            (from packages/cli/ or repo root)
 *
 * Environment variables (put in telegram/.env or export directly):
 *   TELEGRAM_BOT_TOKEN  — from @BotFather
 *   TELEGRAM_CHAT_ID    — group or personal chat ID
 *   ANTHROPIC_API_KEY   — for /ask command (optional)
 *   API_PORT            — REST API port (default: 3001)
 */

import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { createBot } from "./bot.js";
import { startScheduler } from "./scheduler.js";
import { startApiServer } from "../src/api/server.js";

// Load telegram/.env if it exists (Node >= 20.12 built-in)
const __dirname = fileURLToPath(new URL(".", import.meta.url));
try {
  process.loadEnvFile(resolve(__dirname, ".env"));
} catch {
  // .env not present — rely on environment variables set externally
}

const bot = createBot();
startScheduler(bot);

const apiPort = parseInt(process.env["API_PORT"] ?? "3001", 10);
startApiServer(apiPort);

bot.launch();

process.once("SIGINT", () => bot.stop("SIGINT"));
process.once("SIGTERM", () => bot.stop("SIGTERM"));

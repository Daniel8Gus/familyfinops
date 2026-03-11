export interface TelegramConfig {
  botToken: string;
  chatId: string;
}

/**
 * Maps Telegram user IDs to RiseUp profile names.
 * Add Shelly's Telegram ID when she joins the group.
 */
export const USERS: Record<number, "daniel" | "shelly"> = {
  5098701779: "daniel",
  // Add Shelly: 123456789: "shelly",
};

/**
 * Read TELEGRAM_BOT_TOKEN and TELEGRAM_CHAT_ID from the environment.
 * Throws a clear error if either is missing.
 */
export function getConfig(): TelegramConfig {
  const botToken = process.env["TELEGRAM_BOT_TOKEN"];
  const chatId = process.env["TELEGRAM_CHAT_ID"];

  if (!botToken) {
    throw new Error(
      "TELEGRAM_BOT_TOKEN is not set. Add it to telegram/.env or your environment.",
    );
  }
  if (!chatId) {
    throw new Error(
      "TELEGRAM_CHAT_ID is not set. Add it to telegram/.env or your environment.",
    );
  }

  return { botToken, chatId };
}

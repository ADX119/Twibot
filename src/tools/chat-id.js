// One-time, local only: send your bot any message, then run
//   npm run chat-id
// to see the chat id to use as TELEGRAM_CHAT_ID. Updates are not consumed.
import { requireEnv } from "../config.js";
import { logError } from "../log.js";
import { telegram } from "../sources/telegram.js";

if (process.env.GITHUB_ACTIONS === "true") {
  console.error("Run this locally, not in GitHub Actions (logs are public).");
  process.exit(1);
}

try {
  requireEnv(["TELEGRAM_BOT_TOKEN"]);
  const updates = await telegram("getUpdates", { timeout: 0 });
  const chats = new Map();
  for (const u of updates) {
    const chat = u.message?.chat;
    if (chat) chats.set(chat.id, chat.first_name || chat.title || chat.username || "");
  }
  if (chats.size === 0) console.log("No messages yet: send your bot a message in Telegram and run this again.");
  for (const [id, name] of chats) console.log(`TELEGRAM_CHAT_ID=${id}  (${name})`);
} catch (err) {
  logError("telegram", err);
  process.exitCode = 1;
}

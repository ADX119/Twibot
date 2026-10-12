import { HttpError } from "../config.js";
import { buildIntentUrl } from "../tweet.js";
import { createRow, findBySourceId } from "../store/notion.js";

const HELP_TEXT = [
  "Twibot is listening 👋",
  "",
  "Text me anything you built, fixed, learned or struggled with today.",
  "A few times a day I'll send tweet drafts — tap 📤 Post A or 📤 Post B to open X with the tweet ready, then hit Post.",
  "",
  "Tip: keep confidential work details out of notes.",
].join("\n");

export async function telegram(method, body = {}) {
  const res = await fetch(
    `https://api.telegram.org/bot${process.env.TELEGRAM_BOT_TOKEN}/${method}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    }
  );
  const json = await res.json().catch(() => ({}));
  if (!res.ok || !json.ok) throw new HttpError("telegram", json.error_code ?? res.status);
  return json.result;
}

const ownChat = () => String(process.env.TELEGRAM_CHAT_ID);

export function sendMessage(text, buttons) {
  return telegram("sendMessage", {
    chat_id: ownChat(),
    text,
    link_preview_options: { is_disabled: true },
    reply_markup: buttons ? { inline_keyboard: buttons } : undefined,
  });
}

export function formatDraftMessage({ source, draftA, draftB }) {
  const parts = [`📝 New tweet draft (from ${source})`, "", `A:\n${draftA}`];
  if (draftB) parts.push("", `B:\n${draftB}`);
  parts.push("", "Tap a button to open X with it ready to post.");
  return parts.join("\n");
}

// Posting is free: each button opens X's compose screen with the text filled
// in, and you hit Post yourself. No X API (or X API cost) involved.
export async function sendDraft(draft) {
  const buttons = [{ text: "📤 Post A", url: buildIntentUrl(draft.draftA) }];
  if (draft.draftB) buttons.push({ text: "📤 Post B", url: buildIntentUrl(draft.draftB) });
  const message = await sendMessage(formatDraftMessage(draft), [buttons]);
  return message.message_id;
}

async function bestEffort(method, body) {
  try {
    await telegram(method, body);
  } catch {
    // ignore
  }
}

// Reads pending messages and saves your notes as Notion rows. Updates are
// acknowledged only after all of them were handled, so a failure means they
// are retried on the next run (SourceId dedupe prevents duplicates).
export async function processTelegramUpdates({ dryRun = false } = {}) {
  const counts = { notes: 0, ignored: 0 };
  const updates = await telegram("getUpdates", { timeout: 0, allowed_updates: ["message"] });
  if (dryRun) {
    counts.pending = updates.length;
    return counts;
  }

  for (const update of updates) {
    const message = update.message;
    if (!message) continue;
    if (String(message.chat.id) !== ownChat()) {
      counts.ignored += 1;
      continue;
    }
    const text = (message.text || message.caption || "").trim();
    if (!text) continue;
    if (text.startsWith("/")) {
      if (/^\/(start|help)\b/.test(text)) await sendMessage(HELP_TEXT);
      continue;
    }

    const sourceId = `tg:${update.update_id}`;
    if (await findBySourceId(sourceId)) continue;
    await createRow({ name: text, source: "Telegram", sourceId });
    counts.notes += 1;
    await bestEffort("setMessageReaction", {
      chat_id: ownChat(),
      message_id: message.message_id,
      reaction: [{ type: "emoji", emoji: "👍" }],
    });
  }

  if (updates.length > 0) {
    const lastId = Math.max(...updates.map((u) => u.update_id));
    await telegram("getUpdates", { offset: lastId + 1, timeout: 0, limit: 1 });
  }
  return counts;
}

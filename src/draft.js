// Draft run: collect notes + GitHub activity, write 2 tweet options with
// Gemini, and send them to Telegram with one-tap "Post on X" buttons.
//   node src/draft.js [--slot=morning|midday|afternoon|evening] [--dry-run]
import { argValue, config, isDryRun, requireEnv } from "./config.js";
import { generateVariants } from "./llm/gemini.js";
import { log, logError, printLocal } from "./log.js";
import { ingestGithub } from "./sources/github.js";
import { processTelegramUpdates, sendDraft, sendMessage } from "./sources/telegram.js";
import { STATUS, countCreatedSince, listByStatus, prop, updateRow } from "./store/notion.js";
import { hourIn, startOfToday } from "./time.js";

const SLOTS = ["morning", "midday", "afternoon", "evening"];
const MAX_RECAP_ITEMS = 8;
const SOURCE_PRIORITY = { Telegram: 0, Manual: 0, GitHub: 1 };

// Scheduled runs are often delayed, so the slot comes from the cron that
// fired, not from the clock. Keep in sync with .github/workflows/draft.yml.
const SLOT_BY_CRON = {
  "17 4 * * *": "morning",
  "47 7 * * *": "midday",
  "17 12 * * *": "afternoon",
  "47 15 * * *": "evening",
};

function resolveSlot() {
  const requested = argValue("slot") || process.env.SLOT;
  if (SLOTS.includes(requested)) return requested;
  if (SLOT_BY_CRON[process.env.SCHEDULE]) return SLOT_BY_CRON[process.env.SCHEDULE];
  const hour = hourIn(config.timezone);
  if (hour < 11) return "morning";
  if (hour < 15) return "midday";
  if (hour < 19) return "afternoon";
  return "evening";
}

function pickRows(rows, slot, todayIso) {
  if (rows.length === 0) return [];
  if (slot === "evening") {
    const today = rows.filter((row) => row.createdTime >= todayIso);
    return (today.length > 0 ? today : rows).slice(-MAX_RECAP_ITEMS);
  }
  // Prefer things you wrote yourself over GitHub activity, newest first.
  const sorted = [...rows].sort(
    (a, b) =>
      SOURCE_PRIORITY[a.source] - SOURCE_PRIORITY[b.source] ||
      b.createdTime.localeCompare(a.createdTime)
  );
  return [sorted[0]];
}

async function main() {
  requireEnv(["GEMINI_API_KEY", "TELEGRAM_BOT_TOKEN", "TELEGRAM_CHAT_ID", "NOTION_TOKEN", "NOTION_DATABASE_ID"]);
  const slot = resolveSlot();
  const todayIso = startOfToday(config.timezone);

  const tgCounts = await processTelegramUpdates({ dryRun: isDryRun });
  let ghCounts = {};
  let ghPreviews = [];
  try {
    ({ counts: ghCounts, previews: ghPreviews } = await ingestGithub({ dryRun: isDryRun }));
  } catch (err) {
    // GitHub being down shouldn't block drafting from your own notes.
    logError("github", err);
  }

  const newRows = [...(await listByStatus(STATUS.NEW)), ...ghPreviews];
  const picked = pickRows(newRows, slot, todayIso);
  const counts = { slot, ...tgCounts, ...ghCounts, inbox: newRows.length, picked: picked.length };

  if (picked.length === 0) {
    if (slot === "evening" && !isDryRun && (await countCreatedSince(todayIso)) === 0) {
      await sendMessage("Nothing logged today 👀 What did you work on? Reply here and I'll draft it.");
      counts.nudged = 1;
    }
    log("draft", { ...counts, drafted: 0 });
    return;
  }

  const variants = await generateVariants(picked.map((row) => row.name), slot);
  const [primary, ...rest] = picked;
  const draft = {
    id: primary.id,
    source: picked.length > 1 ? "today's notes" : primary.source,
    draftA: variants[0],
    draftB: variants[1] || "",
  };

  if (isDryRun) {
    printLocal("Draft A", draft.draftA);
    if (draft.draftB) printLocal("Draft B", draft.draftB);
    log("draft", { ...counts, drafted: 0, dry_run: 1 });
    return;
  }

  await sendDraft(draft);
  await updateRow(primary.id, {
    Status: prop.select(STATUS.DRAFTED),
    "Draft A": prop.text(draft.draftA),
    "Draft B": prop.text(draft.draftB),
  });
  // Notes folded into an evening recap are used up too.
  for (const row of rest) {
    await updateRow(row.id, { Status: prop.select(STATUS.DRAFTED) });
  }
  log("draft", { ...counts, drafted: 1, variants: variants.length });
}

main().catch((err) => {
  logError(err.service || "draft", err);
  process.exitCode = 1;
});

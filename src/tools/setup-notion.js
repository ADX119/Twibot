// One-time: adds every column the bot needs to your Notion database.
//   npm run setup-notion
import { requireEnv } from "../config.js";
import { logError } from "../log.js";
import { ensureSchema } from "../store/notion.js";

try {
  requireEnv(["NOTION_TOKEN", "NOTION_DATABASE_ID"]);
  await ensureSchema();
  console.log("Notion database is ready.");
} catch (err) {
  logError("notion", err);
  if (err.status === 404) {
    console.error("Database not found: share it with your integration (••• → Connections) and check NOTION_DATABASE_ID.");
  }
  process.exitCode = 1;
}

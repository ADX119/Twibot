import { HttpError } from "../config.js";

// Pinned API version: plain fetch against a stable version keeps the
// dependency list (and supply-chain surface) small.
const NOTION_VERSION = "2022-06-28";
const TEXT_CHUNK = 2000; // Notion's per-rich-text-object limit

// Set Status to Skipped in Notion yourself to drop an idea.
export const STATUS = {
  NEW: "New",
  DRAFTED: "Drafted",
  SKIPPED: "Skipped",
};

async function notion(path, method = "GET", body) {
  const res = await fetch(`https://api.notion.com/v1/${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${process.env.NOTION_TOKEN}`,
      "Notion-Version": NOTION_VERSION,
      "Content-Type": "application/json",
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) throw new HttpError("notion", res.status);
  return res.json();
}

// ---- property helpers ----

function textObjects(text = "") {
  const chunks = [];
  for (let i = 0; i < text.length && chunks.length < 100; i += TEXT_CHUNK) {
    chunks.push({ type: "text", text: { content: text.slice(i, i + TEXT_CHUNK) } });
  }
  return chunks;
}

export const prop = {
  title: (text) => ({ title: textObjects(text) }),
  text: (text) => ({ rich_text: textObjects(text) }),
  select: (name) => ({ select: name ? { name } : null }),
};

const plain = (richText = []) => richText.map((t) => t.plain_text).join("");

function toRow(page) {
  const p = page.properties;
  return {
    id: page.id,
    createdTime: page.created_time,
    name: plain(p.Name?.title),
    source: p.Source?.select?.name || "Manual",
    status: p.Status?.select?.name || STATUS.NEW,
    sourceId: plain(p.SourceId?.rich_text),
    draftA: plain(p["Draft A"]?.rich_text),
    draftB: plain(p["Draft B"]?.rich_text),
  };
}

// ---- queries ----

async function query(filter, sorts) {
  const rows = [];
  let cursor;
  do {
    const res = await notion(`databases/${process.env.NOTION_DATABASE_ID}/query`, "POST", {
      filter,
      sorts,
      start_cursor: cursor,
      page_size: 100,
    });
    rows.push(...res.results.map(toRow));
    cursor = res.has_more ? res.next_cursor : undefined;
  } while (cursor);
  return rows;
}

const oldestFirst = [{ timestamp: "created_time", direction: "ascending" }];

export function listByStatus(status) {
  const filter =
    status === STATUS.NEW
      ? {
          // Rows added by hand in Notion may have no Status yet.
          or: [
            { property: "Status", select: { equals: STATUS.NEW } },
            { property: "Status", select: { is_empty: true } },
          ],
        }
      : { property: "Status", select: { equals: status } };
  return query(filter, oldestFirst);
}

export async function findBySourceId(sourceId) {
  const rows = await query({ property: "SourceId", rich_text: { equals: sourceId } });
  return rows[0] || null;
}

export async function countCreatedSince(iso) {
  const rows = await query({ timestamp: "created_time", created_time: { on_or_after: iso } });
  return rows.length;
}

// ---- writes ----

export function createRow({ name, source, sourceId }) {
  return notion("pages", "POST", {
    parent: { database_id: process.env.NOTION_DATABASE_ID },
    properties: {
      Name: prop.title(name),
      Source: prop.select(source),
      Status: prop.select(STATUS.NEW),
      SourceId: prop.text(sourceId),
    },
  });
}

export function updateRow(pageId, properties) {
  return notion(`pages/${pageId}`, "PATCH", { properties });
}

// Used by `npm run setup-notion` to add every column the bot needs.
export async function ensureSchema() {
  const db = await notion(`databases/${process.env.NOTION_DATABASE_ID}`);
  const titleKey = Object.keys(db.properties).find((k) => db.properties[k].type === "title");
  const select = (names) => ({ select: { options: names.map((name) => ({ name })) } });
  const properties = {
    Source: select(["Telegram", "GitHub", "Manual"]),
    Status: select(Object.values(STATUS)),
    SourceId: { rich_text: {} },
    "Draft A": { rich_text: {} },
    "Draft B": { rich_text: {} },
    Created: { created_time: {} },
  };
  if (titleKey && titleKey !== "Name") properties[titleKey] = { name: "Name" };
  await notion(`databases/${process.env.NOTION_DATABASE_ID}`, "PATCH", { properties });
}

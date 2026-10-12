import { HttpError, config } from "../config.js";
import { dayKey } from "../time.js";
import { STATUS, createRow, findBySourceId, prop, updateRow } from "../store/notion.js";

const LOOKBACK_HOURS = 26;
const MAX_COMMITS_PER_REPO = 10;

async function github(path) {
  const headers = {
    Accept: "application/vnd.github+json",
    "X-GitHub-Api-Version": "2022-11-28",
    "User-Agent": "twibot",
  };
  if (process.env.GITHUB_TOKEN) headers.Authorization = `Bearer ${process.env.GITHUB_TOKEN}`;
  const res = await fetch(`https://api.github.com/${path}`, { headers });
  if (!res.ok) throw new HttpError("github", res.status);
  return res.json();
}

const firstLine = (text = "") => text.split("\n")[0].trim();
const isNoise = (message) => /^(merge (branch|pull request)|wip$|update readme\.md$)/i.test(message);

// Public activity only: /events/public never includes private repos, and the
// token used in Actions (GITHUB_TOKEN) cannot read other private repos anyway.
export async function collectActivity(username, since = new Date(Date.now() - LOOKBACK_HOURS * 3600e3)) {
  const events = await github(`users/${username}/events/public?per_page=100`);
  const byRepo = new Map();
  const entry = (repo) => {
    if (!byRepo.has(repo)) byRepo.set(repo, { repo, commits: [], highlights: [], prs: new Map() });
    return byRepo.get(repo);
  };

  // Event payloads are trimmed (no commit lists, no PR titles), so commits and
  // PR titles are fetched separately below.
  for (const event of events) {
    if (new Date(event.created_at) < since) continue;
    const repo = event.repo.name;
    const { payload } = event;
    if (event.type === "PushEvent") {
      entry(repo);
    } else if (event.type === "PullRequestEvent") {
      const merged = payload.action === "merged" || (payload.action === "closed" && payload.pull_request?.merged);
      const number = payload.number ?? payload.pull_request?.number;
      if (number && (merged || payload.action === "opened")) {
        // Merged wins over opened when both happened in the window.
        const prs = entry(repo).prs;
        if (merged || !prs.has(number)) prs.set(number, merged ? "Merged" : "Opened");
      }
    } else if (event.type === "CreateEvent" && payload.ref_type === "repository") {
      entry(repo).highlights.push("Created this new repo");
    } else if (event.type === "ReleaseEvent" && payload.action === "published") {
      entry(repo).highlights.push(`Released ${payload.release.tag_name}`);
    }
  }

  const activity = [];
  for (const item of byRepo.values()) {
    try {
      const commits = await github(
        `repos/${item.repo}/commits?author=${encodeURIComponent(username)}&since=${since.toISOString()}&per_page=${MAX_COMMITS_PER_REPO}`
      );
      item.commits = commits.map((c) => firstLine(c.commit.message)).filter((m) => m && !isNoise(m));
      for (const [number, verb] of item.prs) {
        const pr = await github(`repos/${item.repo}/pulls/${number}`);
        item.highlights.push(`${verb} PR: ${pr.title}`);
      }
      if (item.commits.length === 0 && item.highlights.length === 0) continue;
      const repoInfo = await github(`repos/${item.repo}`);
      if (repoInfo.private || repoInfo.fork) continue;
      item.description = repoInfo.description || "";
      activity.push(item);
    } catch (err) {
      // Empty (409) or deleted/renamed (404) repos are skipped, not fatal.
      if (err.status === 409 || err.status === 404) continue;
      throw err;
    }
  }
  return activity;
}

export function describeActivity({ repo, description, commits, highlights }) {
  const lines = [`Worked on my GitHub project ${repo.split("/")[1]}`];
  if (description) lines.push(`Project: ${description}`);
  lines.push(...highlights.map((h) => `- ${h}`));
  lines.push(...commits.map((c) => `- commit: ${c}`));
  return lines.join("\n");
}

// One Notion row per repo per day. If new commits arrive later the same day and
// the row has not been drafted yet, the row is refreshed instead of duplicated.
// In a dry run nothing is written; the would-be rows are returned as previews.
export async function ingestGithub({ dryRun = false } = {}) {
  const counts = { github_new: 0, github_updated: 0 };
  const previews = [];
  if (!config.githubUsername) return { counts, previews };

  const activity = await collectActivity(config.githubUsername);
  for (const item of activity) {
    const sourceId = `gh:${item.repo}:${dayKey(config.timezone)}`;
    const name = describeActivity(item);
    if (dryRun) {
      previews.push({ id: sourceId, name, source: "GitHub", createdTime: new Date().toISOString() });
      counts.github_new += 1;
      continue;
    }
    const existing = await findBySourceId(sourceId);
    if (!existing) {
      await createRow({ name, source: "GitHub", sourceId });
      counts.github_new += 1;
    } else if (existing.status === STATUS.NEW && existing.name !== name) {
      await updateRow(existing.id, { Name: prop.title(name) });
      counts.github_updated += 1;
    }
  }
  return { counts, previews };
}

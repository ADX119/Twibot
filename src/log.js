// The repo is public, so Actions logs are public too.
// Only event names, counts and HTTP statuses are ever printed — never notes,
// drafts, commit messages, repo names, IDs or API error bodies.

export function log(event, counts = {}) {
  const parts = Object.entries(counts).map(([key, value]) => `${key}=${value}`);
  console.log([event, ...parts].join(" "));
}

export function logError(service, err) {
  // Missing-config errors only contain env var names, so they're safe to show.
  if (/^Missing required/.test(err?.message || "")) {
    console.error(`error service=${service} ${err.message}`);
    return;
  }
  const status =
    err?.status ?? err?.code ?? err?.response?.status ?? err?.name ?? "unknown";
  const stage = err?.stage ? ` stage=${err.stage}` : "";
  console.error(`error service=${service}${stage} status=${status}`);
}

// Content may only be printed on a local machine (dry runs), never in CI.
export function printLocal(label, text) {
  if (process.env.GITHUB_ACTIONS === "true") return;
  console.log(`\n--- ${label} ---\n${text}`);
}

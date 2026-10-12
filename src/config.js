import dotenv from "dotenv";
dotenv.config({ quiet: true });

export function requireEnv(keys) {
  const missing = keys.filter((key) => !process.env[key]);
  if (missing.length > 0) {
    throw new Error(`Missing required env vars: ${missing.join(", ")}`);
  }
}

export const config = {
  timezone: process.env.TIMEZONE || "Asia/Kolkata",
  geminiModel: process.env.GEMINI_MODEL || "gemini-3.5-flash-lite",
  githubUsername: process.env.GH_USERNAME || "",
};

export const isDryRun = process.argv.includes("--dry-run");

export function argValue(name) {
  const prefix = `--${name}=`;
  const arg = process.argv.find((a) => a.startsWith(prefix));
  return arg ? arg.slice(prefix.length) : undefined;
}

// Error that carries only the service and HTTP status, never response bodies.
export class HttpError extends Error {
  constructor(service, status) {
    super(`${service} request failed with status ${status}`);
    this.service = service;
    this.status = status;
  }
}

// Strips secrets and personal data before anything is sent to Gemini or X.
// Gemini's free tier may use prompts to improve Google products, so nothing
// sensitive should ever leave this machine/runner.

const PATTERNS = [
  /-----BEGIN [A-Z ]*PRIVATE KEY-----[\s\S]*?-----END [A-Z ]*PRIVATE KEY-----/g,
  /\beyJ[\w-]+\.[\w-]+\.[\w-]+/g, // JWT
  /\b(?:ghp|gho|ghu|ghs|ghr)_[A-Za-z0-9]{20,}/g, // GitHub tokens
  /\bgithub_pat_[A-Za-z0-9_]{20,}/g,
  /\bsk-[A-Za-z0-9_-]{16,}/g, // OpenAI/Anthropic-style keys
  /\bAIza[0-9A-Za-z_-]{30,}/g, // Google API keys
  /\bAKIA[0-9A-Z]{16}\b/g, // AWS access keys
  /\bxox[abprs]-[A-Za-z0-9-]{10,}/g, // Slack tokens
  /\b\d{8,10}:[A-Za-z0-9_-]{30,}/g, // Telegram bot tokens
  /\b[\w.+-]+@[\w-]+(?:\.[\w-]+)+\b/g, // emails
  /\bhttps?:\/\/\S+/gi, // URLs
  /\bwww\.\S+/gi,
  /\b(?:\d{1,3}\.){3}\d{1,3}(?::\d+)?\b/g, // IPv4
  /\+\d{1,3}[\s-]?\d[\d\s-]{7,}\d/g, // phone with country code
  /\b\d{10}\b/g, // 10-digit phone
  /\b[A-Fa-f0-9]{32,}\b/g, // long hex (hashes, keys)
  /\b[A-Za-z0-9+/_-]{40,}={0,2}/g, // long base64-ish blobs
];

export const REDACTED = "[redacted]";

export function redact(text) {
  return PATTERNS.reduce((out, pattern) => out.replace(pattern, REDACTED), text);
}

export function containsSensitive(text) {
  // String#search ignores the global flag's lastIndex, so patterns stay reusable.
  return PATTERNS.some((pattern) => text.search(pattern) !== -1);
}

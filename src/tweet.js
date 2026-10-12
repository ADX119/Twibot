import { containsSensitive, REDACTED } from "./redact.js";

export const MAX_TWEET_LENGTH = 280;
const MAX_HASHTAGS = 1;

// X's weighted length: most Latin/punctuation characters count 1, everything
// else (CJK, emoji, …) counts 2. Emoji sequences are over-counted, which only
// makes the check stricter.
const SINGLE_WEIGHT_RANGES = [
  [0, 4351],
  [8192, 8205],
  [8208, 8223],
  [8242, 8247],
];

export function weightedLength(text) {
  let length = 0;
  for (const char of text.normalize("NFC")) {
    const codePoint = char.codePointAt(0);
    const single = SINGLE_WEIGHT_RANGES.some(
      ([start, end]) => codePoint >= start && codePoint <= end
    );
    length += single ? 1 : 2;
  }
  return length;
}

const WRAPPING_QUOTES = /^["'`“”‘’]+|["'`“”‘’]+$/g;
const PREAMBLE = /^(?:here(?:'s| is)[^:\n]*|tweet(?: option)?\s*\d*|option\s*[ab12])\s*:\s*/i;

const stripQuotes = (text) => text.trim().replace(WRAPPING_QUOTES, "").trim();

export function cleanTweet(raw) {
  // Quotes may wrap the preamble ("Here's a tweet: …") or just the tweet.
  return stripQuotes(stripQuotes(raw).replace(PREAMBLE, ""))
    .replace(/\s*—\s*/g, ", ") // em dashes are the #1 AI tell
    .replace(/\n{3,}/g, "\n\n");
}

// Returns a reason string (safe to log) or null when the tweet is fine.
export function tweetProblem(text) {
  if (!text) return "empty";
  if (weightedLength(text) > MAX_TWEET_LENGTH) return "too_long";
  if (text.includes(REDACTED) || containsSensitive(text)) return "sensitive";
  if ((text.match(/#\w+/g) || []).length > MAX_HASHTAGS) return "hashtags";
  return null;
}

export function buildIntentUrl(text) {
  return `https://x.com/intent/post?text=${encodeURIComponent(text)}`;
}

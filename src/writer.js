// Turns raw notes into the 2 best tweet drafts in three Gemini calls:
//   1. plan:  is there a post here at all, and what's the angle a stranger cares about?
//   2. write: 5 drafts of that angle, each in a different format
//   3. judge: score them for replies/shares and truth, keep the top 2
import { Type } from "@google/genai";
import { generateJson } from "./llm/gemini.js";
import { PERSONA, soundsLikeAI } from "./persona.js";
import { redact } from "./redact.js";
import { cleanTweet, tweetProblem } from "./tweet.js";

const CANDIDATES = 5;
const MIN_SCORE = 5; // out of 10: below this the judge thinks it would flop
const SLOT_HINTS = {
  morning: "Posting in the morning.",
  midday: "Posting around midday.",
  afternoon: "Posting in the late afternoon.",
  evening: "Posting in the evening: these are today's notes, the post can connect more than one of them.",
};

const notesBlock = (notes) => [
  "My raw notes (messy, written for myself):",
  ...notes.map((note) => `- ${redact(note).replace(/\n/g, "\n  ")}`),
];

// The first few words, normalised, so "Wait, X..." and "wait x..." match.
export function opener(text, words = 3) {
  return text.toLowerCase().replace(/[^a-z0-9\s]/g, " ").split(/\s+/).filter(Boolean).slice(0, words).join(" ");
}

export function repeatsOpener(text, recentDrafts) {
  const start = opener(text);
  return start.length > 0 && recentDrafts.some((draft) => opener(draft) === start);
}

// Keeps candidates that pass the local checks, best judge score first.
export function pickWinners(candidates, scores, recentDrafts, count = 2) {
  const scoreOf = new Map(scores.map((s) => [s.index, s.score]));
  const winners = [];
  const seen = new Set();
  const ranked = candidates
    .map((candidate, index) => ({ ...candidate, text: cleanTweet(candidate.text || ""), score: scoreOf.get(index) ?? 0 }))
    .sort((a, b) => b.score - a.score);
  for (const candidate of ranked) {
    const start = opener(candidate.text);
    if (candidate.score < MIN_SCORE) break; // sorted, so the rest score lower
    if (tweetProblem(candidate.text) !== null || soundsLikeAI(candidate.text)) continue;
    if (repeatsOpener(candidate.text, recentDrafts) || seen.has(start)) continue;
    seen.add(start);
    winners.push(candidate);
    if (winners.length === count) break;
  }
  return winners;
}

async function plan(notes, slot) {
  return generateJson({
    stage: "plan",
    temperature: 0.4,
    contents: [
      SLOT_HINTS[slot] || SLOT_HINTS.midday,
      ...notesBlock(notes),
      "",
      "Before writing anything, decide what the post is about.",
      `- worth_posting: false if nothing here would interest a stranger who follows ${PERSONA.niche} (e.g. only a gym session or a holiday, with no link to the dev/career story). Being honest here protects the account: posts nobody engages with drag down reach.`,
      "- angle: the single most interesting thing in these notes for that stranger, and why they'd care (the tension, surprise, number or stakes). Tie it to the bigger story when it fits. One or two sentences.",
      "- facts: the concrete facts from the notes the post can use (numbers, names, what happened). Nothing invented.",
      "- image_idea: one screenshot or photo I could attach that would make people stop (e.g. the PR, the extension's pricing page, the gym report), or empty if none fits.",
      "- reply_idea: if not worth posting, what kind of bigger dev accounts I should reply to instead today, in one line. Otherwise empty.",
    ].join("\n"),
    schema: {
      type: Type.OBJECT,
      properties: {
        worth_posting: { type: Type.BOOLEAN },
        angle: { type: Type.STRING },
        facts: { type: Type.ARRAY, items: { type: Type.STRING } },
        image_idea: { type: Type.STRING },
        reply_idea: { type: Type.STRING },
      },
      required: ["worth_posting", "angle", "facts", "image_idea", "reply_idea"],
    },
    accept: (json) => (typeof json.worth_posting === "boolean" ? json : null),
  });
}

async function write(notes, angle, recentDrafts) {
  const mood = PERSONA.moods[Math.floor(Math.random() * PERSONA.moods.length)];
  return generateJson({
    stage: "write",
    temperature: 0.9,
    contents: [
      ...notesBlock(notes),
      "",
      `Angle: ${angle.angle}`,
      `Facts you may use (the only facts allowed): ${angle.facts.join("; ")}`,
      "Don't add durations, outcomes or details that aren't in these facts. 'Opened' a PR is not 'merged' or 'shipped'.",
      `Mood: ${mood}.`,
      "",
      `Write ${CANDIDATES} different tweets about this angle. Each uses a different format from this list:`,
      ...PERSONA.formats.map((f) => `- ${f}`),
      "",
      "Every tweet must open differently. Don't start like any of these recent posts:",
      ...(recentDrafts.length > 0 ? recentDrafts.map((d) => `- ${opener(d, 6)}…`) : ["- (none yet)"]),
      "",
      "Use \\n for line breaks inside the text.",
    ].join("\n"),
    schema: {
      type: Type.OBJECT,
      properties: {
        candidates: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: { format: { type: Type.STRING }, text: { type: Type.STRING } },
            required: ["format", "text"],
          },
        },
      },
      required: ["candidates"],
    },
    accept: (json) => (Array.isArray(json.candidates) && json.candidates.length > 0 ? json.candidates : null),
  });
}

async function judge(notes, angle, candidates) {
  return generateJson({
    stage: "judge",
    temperature: 0.2,
    contents: [
      ...notesBlock(notes),
      "",
      `Intended angle: ${angle.angle}`,
      `Allowed facts: ${angle.facts.join("; ")}`,
      "",
      "Candidate tweets:",
      ...candidates.map((c, i) => `${i}. ${JSON.stringify(c.text)}`),
      "",
      "You are a tough editor for a small developer account on X. Score each candidate 0–10.",
      "X ranks posts by replies, shares and follows far above likes, and punishes posts people mute or mark 'not interested'.",
      "Score high: a hook that makes a developer stop, a specific question they'd actually answer, something worth sending to a friend.",
      "First check every claim against the notes and allowed facts. Score 0 if a candidate adds anything they don't say: a time spent, a number, a result, or a stronger verb (merged/shipped/launched for something only opened or started).",
      "Also score 0: a vague or generic question, reads like an AI or a LinkedIn post, or a plain diary entry.",
    ].join("\n"),
    schema: {
      type: Type.OBJECT,
      properties: {
        scores: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: { index: { type: Type.INTEGER }, score: { type: Type.NUMBER } },
            required: ["index", "score"],
          },
        },
      },
      required: ["scores"],
    },
    accept: (json) => (Array.isArray(json.scores) ? json.scores : null),
  });
}

// Returns { skip: true, replyIdea } when the notes aren't worth a post,
// otherwise { variants: [1–2 tweets], imageIdea }. Throws if nothing usable.
export async function writeDrafts(notes, slot, recentDrafts = []) {
  const angle = await plan(notes, slot);
  if (!angle.worth_posting) return { skip: true, replyIdea: angle.reply_idea || "" };

  for (let round = 0; round < 2; round++) {
    const candidates = await write(notes, angle, recentDrafts);
    // A failed judge shouldn't lose good drafts: fall back to the written order.
    const scores = await judge(notes, angle, candidates).catch(() =>
      candidates.map((_, index) => ({ index, score: 10 - index }))
    );
    const winners = pickWinners(candidates, scores, recentDrafts);
    if (winners.length > 0) {
      return { variants: winners.map((w) => w.text), imageIdea: angle.image_idea || "" };
    }
  }
  throw Object.assign(new Error("no draft passed the checks"), { service: "gemini", status: "no_valid_tweet" });
}

import { GoogleGenAI, ThinkingLevel, Type } from "@google/genai";
import { config } from "../config.js";
import { PERSONA, buildSystemInstruction, soundsLikeAI } from "../persona.js";
import { redact } from "../redact.js";
import { cleanTweet, tweetProblem } from "../tweet.js";

// Used for the last attempt, or right away if the main model is retired (404).
const FALLBACK_MODEL = "gemini-2.5-flash";
const REQUEST_TIMEOUT_MS = 30_000;
const RETRYABLE = new Set([429, 500, 503, 504]);
const isTimeout = (err) => err?.name === "AbortError" || err?.name === "TimeoutError";

const SLOT_HINTS = {
  morning: "Posting in the morning.",
  midday: "Posting around midday.",
  afternoon: "Posting in the late afternoon.",
  evening: "Posting in the evening: these are today's notes, it can mention more than one thing.",
};

let client;
const ai = () =>
  (client ??= new GoogleGenAI({
    apiKey: process.env.GEMINI_API_KEY,
    // The SDK has no timeout by default; a hung call would eat the whole run.
    httpOptions: { timeout: REQUEST_TIMEOUT_MS },
  }));

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

function buildPrompt(notes, slot, mood) {
  return [
    SLOT_HINTS[slot] || SLOT_HINTS.midday,
    `Mood: ${mood}.`,
    "My raw notes (messy, written for myself):",
    ...notes.map((note) => `- ${redact(note).replace(/\n/g, "\n  ")}`),
    "",
    "Write 2 tweet options. Option 1 stays very close to my wording. Option 2 says it a bit differently.",
  ].join("\n");
}

function generationConfig(model) {
  const cfg = {
    systemInstruction: buildSystemInstruction(),
    temperature: 0.8,
    responseMimeType: "application/json",
    responseSchema: {
      type: Type.OBJECT,
      properties: { variants: { type: Type.ARRAY, items: { type: Type.STRING } } },
      required: ["variants"],
    },
  };
  // Models think by default; a tweet doesn't need it and it costs time and quota.
  // 2.5 models take a token budget, newer ones a thinking level.
  cfg.thinkingConfig = model.startsWith("gemini-2.5")
    ? { thinkingBudget: 0 }
    : { thinkingLevel: ThinkingLevel.LOW };
  return cfg;
}

// Returns 1–2 valid tweet variants, or throws.
export async function generateVariants(notes, slot) {
  const mood = PERSONA.moods[Math.floor(Math.random() * PERSONA.moods.length)];
  const contents = buildPrompt(notes, slot, mood);

  const plan = [config.geminiModel, config.geminiModel, FALLBACK_MODEL];

  for (let attempt = 0; attempt < plan.length; attempt++) {
    const model = plan[attempt];
    try {
      const res = await ai().models.generateContent({
        model,
        contents,
        config: generationConfig(model),
      });
      const { variants = [] } = JSON.parse(res.text || "{}");
      const valid = variants
        .map(cleanTweet)
        .filter((t) => tweetProblem(t) === null && !soundsLikeAI(t));
      const unique = [...new Set(valid)].slice(0, 2);
      if (unique.length > 0) return unique;
    } catch (err) {
      const isLast = attempt === plan.length - 1;
      if (err?.status === 404 && !isLast) {
        attempt = plan.length - 2; // model retired: go straight to the fallback
        continue;
      }
      const retryable = err instanceof SyntaxError || isTimeout(err) || RETRYABLE.has(err?.status);
      if (!retryable || isLast) {
        err.service = "gemini";
        throw err;
      }
    }
    if (attempt < plan.length - 1) await sleep(2000 * 2 ** attempt);
  }
  throw Object.assign(new Error("gemini returned no valid tweet"), {
    service: "gemini",
    status: "no_valid_tweet",
  });
}

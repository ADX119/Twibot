import { GoogleGenAI, ThinkingLevel } from "@google/genai";
import { config } from "../config.js";
import { buildSystemInstruction } from "../persona.js";

// Used for the last attempt, or right away if the main model is retired (404).
const FALLBACK_MODEL = "gemini-2.5-flash";
const REQUEST_TIMEOUT_MS = 60_000; // thinking takes longer than a plain reply
const RETRYABLE = new Set([429, 500, 503, 504]);
const isTimeout = (err) => err?.name === "AbortError" || err?.name === "TimeoutError";

let client;
const ai = () =>
  (client ??= new GoogleGenAI({
    apiKey: process.env.GEMINI_API_KEY,
    // The SDK has no timeout by default; a hung call would eat the whole run.
    httpOptions: { timeout: REQUEST_TIMEOUT_MS },
  }));

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

function generationConfig(model, schema, temperature) {
  return {
    systemInstruction: buildSystemInstruction(),
    temperature,
    responseMimeType: "application/json",
    responseSchema: schema,
    // Finding the angle and judging drafts need real reasoning, so thinking
    // stays on. 2.5 models take a token budget, newer ones a thinking level.
    thinkingConfig: model.startsWith("gemini-2.5")
      ? { thinkingBudget: 2048 }
      : { thinkingLevel: ThinkingLevel.MEDIUM },
  };
}

// Asks Gemini for JSON matching `schema`. `accept(json)` returns the value to
// keep, or null to ask again. Throws when every attempt fails.
export async function generateJson({ stage, contents, schema, temperature = 0.7, accept = (j) => j }) {
  const plan = [config.geminiModel, config.geminiModel, FALLBACK_MODEL];

  for (let attempt = 0; attempt < plan.length; attempt++) {
    const model = plan[attempt];
    try {
      const res = await ai().models.generateContent({
        model,
        contents,
        config: generationConfig(model, schema, temperature),
      });
      const value = accept(JSON.parse(res.text || "{}"));
      if (value != null) return value;
    } catch (err) {
      const isLast = attempt === plan.length - 1;
      if (err?.status === 404 && !isLast) {
        attempt = plan.length - 2; // model retired: go straight to the fallback
        continue;
      }
      const retryable = err instanceof SyntaxError || isTimeout(err) || RETRYABLE.has(err?.status);
      if (!retryable || isLast) {
        err.service = "gemini";
        err.stage = stage;
        throw err;
      }
    }
    if (attempt < plan.length - 1) await sleep(2000 * 2 ** attempt);
  }
  throw Object.assign(new Error(`gemini returned nothing usable for ${stage}`), {
    service: "gemini",
    stage,
    status: "no_valid_output",
  });
}

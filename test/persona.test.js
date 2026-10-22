import assert from "node:assert/strict";
import { test } from "node:test";
import { PERSONA, soundsLikeAI } from "../src/persona.js";
import { cleanTweet } from "../src/tweet.js";

// Real drafts Gemini produced before the persona rewrite.
const AI_SOUNDING = [
  "Spent hours wondering why my evening recap bot was ghosting me. Turns out it thinks midnight happens in UTC instead of IST. Timezones remain undefeated.",
  "Nothing humbles a software developer quite like a bot refusing to work because it lives in UTC.",
  "Today's small victory: Squashed a sneaky timezone bug.",
  "Lesson learned today: Always double-check timezone assumptions!",
  "My dev day recap: rebuilt my Twitter bot. Streamlining the build-in-public process. ✨",
  "Shipped one-tap posting for my tweet bot. #buildinpublic",
  "Excited to announce my new side project",
];

test("flags AI-sounding drafts", () => {
  for (const draft of AI_SOUNDING) assert.ok(soundsLikeAI(draft), draft);
});

test("accepts the style examples and plain dev tweets", () => {
  for (const example of PERSONA.styleExamples) assert.equal(soundsLikeAI(example), false, example);
  assert.equal(soundsLikeAI("fixed the timezone bug. midnight was being calculated in UTC so the evening recap missed notes"), false);
});

test("flags the generic question nobody answers", () => {
  assert.ok(soundsLikeAI("push day done.\n\nhow do you usually split your mornings?"));
});

test("cleanTweet replaces em dashes", () => {
  assert.equal(cleanTweet("fixed it — finally"), "fixed it, finally");
});

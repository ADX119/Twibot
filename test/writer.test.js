import assert from "node:assert/strict";
import { test } from "node:test";
import { opener, pickWinners, repeatsOpener } from "../src/writer.js";

test("opener ignores case and punctuation", () => {
  assert.equal(opener("Wait, the client actually liked it?"), "wait the client");
  assert.equal(opener("wait the client said yes"), "wait the client");
});

test("repeatsOpener catches a recent draft's opening", () => {
  const recent = ["wait, cron-job.org actually fixed it", "push day done before work"];
  assert.ok(repeatsOpener("Wait, cron job org works now", recent));
  assert.equal(repeatsOpener("client #3 came from client #2", recent), false);
});

test("pickWinners keeps the best-scored valid drafts with different openers", () => {
  const candidates = [
    { format: "number", text: "body fat: 30%.\n\ngoal set with my trainers today." },
    { format: "story", text: "client #2 came from client #1.\n\nnever ran an ad." },
    { format: "ask", text: "client #2 came from client #1 again" }, // same opener as a better one
    { format: "grind", text: "excited to share my gym update" }, // AI tell
    { format: "opinion", text: "wait, the gym helps coding?" }, // repeats a recent draft
  ];
  const scores = [
    { index: 0, score: 7 },
    { index: 1, score: 9 },
    { index: 2, score: 8 },
    { index: 3, score: 10 },
    { index: 4, score: 10 },
  ];
  const winners = pickWinners(candidates, scores, ["wait, the gym is open"]);
  assert.deepEqual(winners.map((w) => w.format), ["story", "number"]);
});

test("pickWinners drops drafts the judge scored as flops", () => {
  const candidates = [{ format: "number", text: "did push day" }];
  assert.deepEqual(pickWinners(candidates, [{ index: 0, score: 3 }], []), []);
});

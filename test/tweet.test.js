import assert from "node:assert/strict";
import { test } from "node:test";
import {
  buildIntentUrl,
  cleanTweet,
  tweetProblem,
  weightedLength,
} from "../src/tweet.js";

test("weightedLength counts Latin as 1 and emoji/CJK as 2", () => {
  assert.equal(weightedLength("hello"), 5);
  assert.equal(weightedLength("🚀"), 2);
  assert.equal(weightedLength("日本"), 4);
});

test("cleanTweet strips quotes and preambles", () => {
  assert.equal(cleanTweet('"Shipped dark mode today."'), "Shipped dark mode today.");
  assert.equal(cleanTweet("Here's a tweet: Fixed the auth bug"), "Fixed the auth bug");
  assert.equal(cleanTweet("Option A: Fixed it"), "Fixed it");
  assert.equal(cleanTweet("“Smart quotes too”"), "Smart quotes too");
  assert.equal(cleanTweet('"Here\'s a tweet: Fixed it."'), "Fixed it.");
  assert.equal(cleanTweet('Tweet: "Fixed it."'), "Fixed it.");
});

test("tweetProblem rejects long, sensitive and hashtag-spam tweets", () => {
  assert.equal(tweetProblem("Spent 3 hours on a missing await. Classic."), null);
  assert.equal(tweetProblem(""), "empty");
  assert.equal(tweetProblem("word ".repeat(56) + "x"), "too_long"); // 281
  assert.equal(tweetProblem("word ".repeat(56)), null); // exactly 280
  assert.equal(tweetProblem("Check https://example.com"), "sensitive");
  assert.equal(tweetProblem("Mail me at dev@example.com"), "sensitive");
  assert.equal(tweetProblem("Fixed [redacted] today"), "sensitive");
  assert.equal(tweetProblem("New post #js #node"), "hashtags");
  assert.equal(tweetProblem("C# is fine #dotnet"), null);
});

test("buildIntentUrl encodes the text", () => {
  assert.equal(
    buildIntentUrl("a & b?"),
    "https://x.com/intent/post?text=a%20%26%20b%3F"
  );
});

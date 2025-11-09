import { generateTweet } from "./utils/geminiClient.js";
import { rwClient } from "./utils/twitterClient.js";

export async function postTweet(topic) {
  console.log(`🧠 Generating tweet for topic: "${topic}"`);

  const tweet = await generateTweet(topic);
  if (!tweet) return console.log("⚠️ No tweet generated (Gemini failed).");

  try {
    await rwClient.v2.tweet(tweet);
    console.log("✅ Tweet posted successfully:\n", tweet);
  } catch (err) {
    console.error("❌ Twitter API Error:", err?.data || err);
  }
}

// Manual test mode (node src/index.js "JavaScript tips")
if (process.argv[2]) {
  const topic = process.argv.slice(2).join(" ");
  postTweet(topic);
}

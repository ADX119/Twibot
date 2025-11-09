import { GoogleGenerativeAI } from "@google/generative-ai";
import dotenv from "dotenv";
dotenv.config();

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

export async function generateTweet(topic) {
  try {
    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

    // Random tone generator
    const tones = [
      "funny",
      "sarcastic",
      "motivational",
      "educational",
      "insightful",
    ];
    const randomTone = tones[Math.floor(Math.random() * tones.length)];

    const prompt = `
      Write a tweet in a ${randomTone} tone about: "${topic}".
      Keep it under 280 characters.
      Avoid overused quotes or spammy hashtags.
      Make it sound as much human as possible.
      Use natural language and 1–2 relevant hashtags if needed.
    `;

    const result = await model.generateContent(prompt);
    const tweet = result.response.text().trim();
    return tweet;
  } catch (err) {
    console.error("❌ Gemini Error:", err.message);
    return null;
  }
}

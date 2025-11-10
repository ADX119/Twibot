import cron from "node-cron";
import { postTweet } from "./index.js";
import dotenv from "dotenv";
dotenv.config();

const timezone = process.env.TIMEZONE || "Asia/Kolkata";


const schedule = [
  ["08:00", "Goodmorning Everyone Today's trends"],
  ["11:30", "How is everyone's day so far?"],
  ["11:31", "Doing Coporate work / Rant about Corporate Industry"],
  ["11:32", "Today's Stock Market Trend"],
  ["20:00", "Some Random shitposting on twitter"],
  ["22:00", "Shitposting about software engineering Javascript memes"],
];

schedule.forEach(([time, topic]) => {
  const [hour, minute] = time.split(":");
  const cronExpr = `${minute} ${hour} * * *`; 
  cron.schedule(
    cronExpr,
    async () => {
      console.log(`${time} — Posting topic: ${topic}`);
      await postTweet(topic);
    },
    { timezone }
  );
});

console.log("🟢 Twibot Scheduler started...");
console.log("📅 Scheduled posts:");
schedule.forEach(([t, topic]) => console.log(`   - ${t} → ${topic}`));

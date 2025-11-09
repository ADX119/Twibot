import cron from "node-cron";
import { postTweet } from "./index.js";
import dotenv from "dotenv";
dotenv.config();

const timezone = process.env.TIMEZONE || "Asia/Kolkata";


const schedule = [
  ["20:30", "Goodmorning Everyone Today's trends"],
  ["20:28", "How is everyone's day so far?"],
  ["20:29", "Doing Coporate work / Rant about Corporate Industry"],
  ["20:35", "Today's Stock Market Trend"],
  ["20:40", "Some Random shitposting on twitter"],
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

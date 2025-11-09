import cron from "node-cron";
import { postTweet } from "./index.js";
import dotenv from "dotenv";
dotenv.config();

const timezone = process.env.TIMEZONE || "Asia/Kolkata";


const schedule = [
  ["08:00", "Goodmorning Everyone Today's trends"],
  ["12:00", "How is everyone's day so far?"],
  ["16:00", "Doing Coporate work / Rant about Corporate Industry"],
  ["18:00", "Today's Stock Market Trend"],
  ["22:00", "Some Random shitposting on twitter"],
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

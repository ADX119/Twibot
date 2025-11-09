# 🤖 Twibot 2.0 – AI-Powered Twitter Automation Bot

### ✨ Built by [Aditya Andurkar](https://github.com/ADX119)

---

## 🧠 Overview

**Twibot 2.0** is an **AI-powered Twitter bot** that automatically posts original, human-sounding tweets generated using **Google Gemini 1.5 Flash**.  
It uses **Twitter’s official API** for posting and **GitHub Actions** to run daily for free (no hosting required).

Every tweet is **freshly generated**, based on pre-defined topics and randomized tones — so it feels natural and engaging.

---

## 🚀 Features

- 🧩 **AI-Generated Tweets** using Gemini 2.5 Flash (free API)
- 🕒 **Automatic Scheduling** via `cron` or GitHub Actions
- 🎭 **Randomized Tone** (funny, sarcastic, motivational, etc.)
- 📅 **Topic-Based Timing** (customizable tweet schedule)
- ☁️ **Runs for Free** using GitHub Actions (no server required)
- 🔐 **Secure API Keys** stored in environment variables or GitHub secrets

---

## 🛠️ Tech Stack

| Component | Technology |
|------------|-------------|
| AI Engine | Google Gemini 1.5 Flash (Standard API) |
| Twitter Integration | Twitter API v2 via `twitter-api-v2` |
| Runtime | Node.js (ESM) |
| Scheduler | node-cron / GitHub Actions |
| Deployment | GitHub Actions (cron jobs) |
| Environment | dotenv configuration |

---

## ⚙️ Setup Instructions

### 1️⃣ Clone the Repository

git clone https://github.com/ADX119/twibot-2.0.git
cd twibot-2.0
2️⃣ Install Dependencies
npm install
3️⃣ Add Environment Variables
Create a .env file in the project root:


# Twitter API Keys
API_KEY=your_twitter_api_key
API_SECRET=your_twitter_api_secret
ACCESS_TOKEN=your_twitter_access_token
ACCESS_SECRET=your_twitter_access_secret

# Gemini API (from https://aistudio.google.com/app/apikey)
GEMINI_API_KEY=your_gemini_api_key

# Bot Config
TIMEZONE=Asia/Kolkata
POST_MODE=random
MAX_DAILY_WRITES=10
4️⃣ Test Locally
You can test the bot manually:

node src/index.js "Technology trends"
Expected output:

🧠 Generating tweet for topic: "Technology trends"
✅ Tweet posted successfully:
"AI isn't replacing developers — it's promoting the curious ones. #TechTrends"
🕒 Automation with GitHub Actions
1️⃣ Add Secrets
In your GitHub repository:

Settings → Secrets → Actions → New Repository Secret

Add these:

API_KEY
API_SECRET
ACCESS_TOKEN
ACCESS_SECRET
GEMINI_API_KEY
(Optional: TIMEZONE, POST_MODE, MAX_DAILY_WRITES)

2️⃣ Workflow File
.github/workflows/tweet.yml

name: Twibot AI Tweets

on:
  schedule:
    - cron: '30 2,6,10,12,16 * * *'  # 8AM, 12PM, 4PM, 6PM, 10PM IST
  workflow_dispatch: {}

jobs:
  tweet:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 18
      - run: npm install
      - run: node src/scheduler.js
        env:
          API_KEY: ${{ secrets.API_KEY }}
          API_SECRET: ${{ secrets.API_SECRET }}
          ACCESS_TOKEN: ${{ secrets.ACCESS_TOKEN }}
          ACCESS_SECRET: ${{ secrets.ACCESS_SECRET }}
          GEMINI_API_KEY: ${{ secrets.GEMINI_API_KEY }}
          TIMEZONE: "Asia/Kolkata"
This will automatically tweet 5 times a day using the topics from topics.js.

🧩 Customization
🗂️ Edit Topics
src/utils/topics.js


export const TOPICS = [
  ["08:00", "Goodmorning Everyone Today's trends"],
  ["12:00", "How is everyone's day so far?"],
  ["16:00", "Doing Corporate work / Rant about Corporate Industry"],
  ["18:00", "Today's Stock Market Trend"],
  ["22:00", "Some Random shitposting on twitter"]
];
🧠 Edit Tone Logic
src/utils/geminiClient.js randomizes tones between:

funny, sarcastic, motivational, educational, insightful
You can add or remove tones freely.

📈 Free Usage & Limits
Service	Free Limit	Used By
Twitter API (Free Plan)	500 writes/month	Tweet posting
Gemini 1.5 Flash	Free (1M tokens/month)	AI tweet generation
GitHub Actions	Unlimited (public repo)	Task scheduling

Your setup stays completely free for personal usage.

🔐 Security Note
Never commit your .env file.

Always store API keys in GitHub Secrets for public repositories.

The bot automatically logs only safe data (no keys or sensitive info).

💡 Future Improvements
Thread posting (multi-tweet chains)

Engagement tracking (likes/retweets)

Trend scraping for contextual tweets

Web dashboard to manage topics and frequency

🧑‍💻 Author
Aditya Andurkar
MERN Stack Developer | AI Enthusiast | Corporate Slave

GitHub: ADX119

LinkedIn: Aditya Andurkar

Twitter: @Adx0315

⭐ Support
If you find this useful:

Drop a ⭐ on this repo

Fork it and build your own version

Share it with your developer friends!

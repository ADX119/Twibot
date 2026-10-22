# 🤖 Twibot 3.0: build-in-public tweets, ready when you are

### ✨ Built by [Aditya Andurkar](https://github.com/ADX119)

Twibot turns **what you actually build and do each day** into tweets, so your X account keeps growing even when you forget to post.

1. You drop raw notes whenever: text a Telegram bot, add a row in Notion, or just push code to GitHub.
2. Four times a day, Gemini finds the angle worth posting, writes 5 options in different formats, and a judge step keeps the best 2. If nothing is worth posting, it says so instead of sending you a diary entry.
3. The drafts arrive in Telegram with **📤 Post A / 📤 Post B** buttons.
4. Tap one. X opens with the tweet already written. Hit **Post**.

**100% free:** GitHub Actions (public repo), Gemini Flash free tier, Telegram and Notion. X's free API tier is gone, so Twibot doesn't use the X API at all. The one-tap compose link is free and keeps your account safe.

```
Telegram notes ──┐
Public GitHub ───┼─► Notion "Tweet Inbox" ─► redact ─► Gemini ─► Telegram [📤 Post A] [📤 Post B]
Notion rows ─────┘                                                      │ tap
                                                                        └─► X compose screen ─► Post
```

## 🛠️ Setup (one time, ~15 minutes)

### 1. Telegram bot
1. In Telegram, message **@BotFather** → `/newbot`, then copy the token into `TELEGRAM_BOT_TOKEN` in `.env`.
2. Open your new bot, tap **Start**, and send it any message.
3. Run `npm run chat-id` and copy the number it prints into `TELEGRAM_CHAT_ID`.

### 2. Notion inbox
1. Create an internal integration at <https://www.notion.so/profile/integrations> with read, update and insert content capabilities. Copy its secret into `NOTION_TOKEN`.
2. Create a database (e.g. "Tweet Inbox"). On its page, open **••• → Connections** and add your integration. Share **only this database** with it.
3. Copy the database id (the 32-character part of its URL) into `NOTION_DATABASE_ID`.
4. Run `npm run setup-notion` to add the columns the bot needs.

### 3. Gemini
Create a free key at <https://aistudio.google.com/app/apikey> → `GEMINI_API_KEY`.

### 4. Try it locally
```bash
npm install
cp .env.example .env   # fill in the values from steps 1–3 and GH_USERNAME
npm test
npm run draft -- --dry-run --slot=evening   # prints drafts in your terminal, writes nothing
npm run draft                               # sends a real draft to Telegram
```

### 5. Automate with GitHub Actions
In **Settings → Secrets and variables → Actions**, add:

| Secrets | Variables |
|---|---|
| `GEMINI_API_KEY` | `GH_USERNAME` (required) |
| `TELEGRAM_BOT_TOKEN`, `TELEGRAM_CHAT_ID` | `TIMEZONE` (default `Asia/Kolkata`) |
| `NOTION_TOKEN`, `NOTION_DATABASE_ID` | `GEMINI_MODEL` (default `gemini-3.5-flash-lite`, falls back to `gemini-2.5-flash`) |

### 6. Schedule it with cron-job.org
GitHub's own `schedule:` trigger can run hours late (a 17:47 draft once arrived at 02:45), so a free external cron starts the workflow on time instead.

1. Create a [fine-grained token](https://github.com/settings/personal-access-tokens/new) with access to **only this repo** and **Actions: Read and write**.
2. At [cron-job.org](https://cron-job.org), create a job:
   - URL: `https://api.github.com/repos/<you>/Twibot/actions/workflows/draft.yml/dispatches`
   - Schedule: **Custom**, `47 9,17 * * *`, timezone **Asia/Kolkata** (in the Advanced tab)
   - Method **POST**, body `{"ref":"main","inputs":{"slot":"auto"}}`
   - Headers: `Authorization: Bearer <token>`, `Accept: application/vnd.github+json`, `Content-Type: application/json`
3. Copy the job and change the schedule to `17 13,21 * * *`.
4. Hit **Test run**: you should get `204 No Content` and a new run in the Actions tab.

Drafts then arrive at 09:47, 13:17, 17:47 and 21:17 IST. The slot is picked from the current time, and the last run is a day recap. You can also run it by hand from the Actions tab.

## ✍️ Daily use
- **Text the bot** whatever you did: "fixed a nasty race condition in the payment worker", "first day learning Rust, borrow checker is humbling". It reacts 👍 once the next run saves the note.
- **Push code**: commits and PRs from your public repos become ideas automatically.
- **Add rows in Notion** for longer ideas (Status can stay empty). Set Status to **Skipped** to drop an idea.
- **Tap 📤 Post A or B** on a draft you like, then hit Post in X. Both are written to get replies; attach the 📸 image it suggests when you can. Ignore the drafts you don't like.
- **Reply to comments in the first hour.** Early replies are what X uses to decide whether to show a post to more people.
- Nothing logged by the evening? The bot asks you what you worked on.

Make it sound like you by editing [`src/persona.js`](src/persona.js): your bio, niche, the post formats, and `story`, the things you're working toward right now. Keep `story` current; it's public in this repo and is what turns single notes into a story people follow.

> Tip: if the button opens a browser where you're not logged in to X, turn off Telegram's in-app browser so links open in the X app. On Android it's under **Settings → Chat Settings → In-App Browser**; on iOS, **Settings → Data and Storage → Open Links in**.

## 🔐 Privacy & safety
- **Public logs show counts only** (`draft slot=midday notes=1 drafted=1`). Logs never contain notes, drafts, commit messages or IDs.
- **No private data in the repo.** Notes and drafts live only in your private Notion database. The only personal details in the repo are the public bio and `story` you write in `src/persona.js`. `.env` is gitignored, so never put real values in `.env.example`.
- **Only your Telegram chat is trusted.** Messages from anyone else are ignored.
- **Secrets and personal info are redacted** before anything reaches Gemini: emails, links, IPs, phone numbers, API keys/tokens, JWTs. Drafts that still contain any of these are rejected.
- **Only public GitHub repos** are read.
- **Nothing is ever posted without you.** Every tweet goes out from your own X app.
- ⚠️ Gemini's free tier may use prompts to improve Google's products. **Keep confidential work details (employer code, clients, internal systems) out of your notes.**

## 📈 Limits
| Service | Free limit | Twibot usage |
|---|---|---|
| Gemini Flash (Lite) | hundreds of requests / day | ~12–24 / day (3 per draft, plus retries) |
| GitHub Actions | unlimited for public repos | 4 short runs / day |
| Telegram, Notion, X compose link | free | — |

## 🧑‍💻 Author
Aditya Andurkar, MERN Stack Developer | AI Enthusiast | Corporate Slave
GitHub: [ADX119](https://github.com/ADX119) · Twitter: [@Adx0315](https://x.com/Adx0315)

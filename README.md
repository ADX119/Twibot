# 🤖 Twibot 3.0: build-in-public tweets, ready when you are

### ✨ Built by [Aditya Andurkar](https://github.com/ADX119)

Twibot turns **what you actually build and do each day** into tweets, so your X account keeps growing even when you forget to post.

1. You drop raw notes whenever: text a Telegram bot, add a row in Notion, or just push code to GitHub.
2. Four times a day, Gemini turns them into two human-sounding tweet options.
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

The **Twibot drafts** workflow then runs at 09:47, 13:17, 17:47 and 21:17 IST. The last run is a day recap. You can also run it by hand from the Actions tab.

## ✍️ Daily use
- **Text the bot** whatever you did: "fixed a nasty race condition in the payment worker", "first day learning Rust, borrow checker is humbling". It reacts 👍 once the next run saves the note.
- **Push code**: commits and PRs from your public repos become ideas automatically.
- **Add rows in Notion** for longer ideas (Status can stay empty). Set Status to **Skipped** to drop an idea.
- **Tap 📤 Post A or B** on a draft you like, then hit Post in X. Ignore the drafts you don't like.
- Nothing logged by the evening? The bot asks you what you worked on.

Make it sound like you by editing [`src/persona.js`](src/persona.js) (bio, tones, rules).

> Tip: if the button opens a browser where you're not logged in to X, turn off Telegram's in-app browser so links open in the X app. On Android it's under **Settings → Chat Settings → In-App Browser**; on iOS, **Settings → Data and Storage → Open Links in**.

## 🔐 Privacy & safety
- **Public logs show counts only** (`draft slot=midday notes=1 drafted=1`). Logs never contain notes, drafts, commit messages or IDs.
- **No personal data in the repo.** Notes and drafts live only in your private Notion database. `.env` is gitignored, so never put real values in `.env.example`.
- **Only your Telegram chat is trusted.** Messages from anyone else are ignored.
- **Secrets and personal info are redacted** before anything reaches Gemini: emails, links, IPs, phone numbers, API keys/tokens, JWTs. Drafts that still contain any of these are rejected.
- **Only public GitHub repos** are read.
- **Nothing is ever posted without you.** Every tweet goes out from your own X app.
- ⚠️ Gemini's free tier may use prompts to improve Google's products. **Keep confidential work details (employer code, clients, internal systems) out of your notes.**

## 📈 Limits
| Service | Free limit | Twibot usage |
|---|---|---|
| Gemini Flash (Lite) | hundreds of requests / day | ~4–12 / day |
| GitHub Actions | unlimited for public repos | 4 short runs / day |
| Telegram, Notion, X compose link | free | — |

## 🧑‍💻 Author
Aditya Andurkar, MERN Stack Developer | AI Enthusiast | Corporate Slave
GitHub: [ADX119](https://github.com/ADX119) · Twitter: [@Adx0315](https://x.com/Adx0315)

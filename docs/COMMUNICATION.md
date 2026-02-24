# Communication

Ghostpaw talks to the outside world through channels — persistent messaging integrations that run alongside the interactive REPL or as a background daemon. Each channel maintains its own session history, so conversations on Telegram don't bleed into terminal chats.

Channels connect automatically at startup when their credentials are configured. No config files to edit, no flags to pass.

## Telegram

Talk to your Ghostpaw instance from your phone. Messages go through Telegram's servers to your bot, your bot runs locally on your machine, and the LLM call happens from there. Nothing is stored on Telegram's side beyond normal message delivery.

### Setup

**1. Create a bot.**

Open Telegram, search for `@BotFather`, send `/newbot`. Pick a name and a username (must end in `bot`). BotFather replies with an API token — a string like `123456:ABC-DEF1234ghIkl-zyx57W2v1u123ew11`.

**2. Store the token.**

```bash
ghostpaw secrets set TELEGRAM_BOT_TOKEN
```

Paste the token at the masked prompt. It's stored in your local database and loaded automatically on every startup.

**3. Start Ghostpaw.**

```bash
ghostpaw          # interactive REPL — Telegram connects alongside
ghostpaw daemon   # headless background mode
```

The banner confirms the connection:

```
ghostpaw v0.3.0

  channels  telegram @YourBot
```

**4. Message your bot.**

Open the chat with your bot in Telegram and send a message. Ghostpaw responds. The bot shows a typing indicator while it thinks, splits long responses across multiple messages, and reacts with 👀 (seen), 👍 (done), or 👎 (error) for read receipts.

### Access Control

By default, anyone who finds your bot's username can message it. For a private bot, restrict access by chat ID. Currently set in code via `allowedChatIds` in the channel config — a proper secrets-based allowlist is planned.

To find your chat ID: send a message to the bot, then check the logs or use `@userinfobot` on Telegram.

### Sticky Sessions

Each Telegram chat gets its own persistent session keyed by chat ID. Send a message today, come back next week — the agent remembers the full conversation. Sessions survive daemon restarts.

### Offline Messages

Messages sent while the bot is down are delivered by Telegram when the bot reconnects. Ghostpaw processes them in order on startup — nothing is lost.

### One-Shot Notifications

Autonomous tasks (cron jobs, scheduled runs) can send messages to Telegram without starting the full polling channel:

```javascript
import { sendTelegramNotification } from "ghostpaw";

await sendTelegramNotification({
  token: process.env.TELEGRAM_BOT_TOKEN,
  chatId: 123456789,
  text: "Daily report: all systems nominal.",
  workspace: "/path/to/workspace", // optional — logs the message in the session
});
```

When `workspace` is provided, the notification is recorded in the Telegram session's chat history, so the agent sees it in context during future conversations.

---

## Discord

_Planned._ Guild-based channel with role-aware access control. Same sticky-session model as Telegram.

## Web UI

_Planned._ Lightweight HTTP interface for browser-based interaction. No framework — server-sent events for streaming, static HTML served from the single `.mjs` artifact.

## CLI (Non-Interactive)

Already available. `ghostpaw run "prompt"` for one-shot execution, `ghostpaw daemon` for headless background operation with channels active. See the main [README](../README.md) for usage.

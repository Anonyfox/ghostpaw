# Setup Guide

Ghostpaw requires **Node.js 24 or later**. That's the only prerequisite.

---

## 1. Install Node.js 24+

Check if you already have it:

```bash
node --version
# needs to print v24.0.0 or higher
```

If you need to install or upgrade:

**Using fnm (recommended):**

```bash
curl -fsSL https://fnm.vercel.app/install | bash
fnm install 24
fnm use 24
```

**Using nvm:**

```bash
nvm install 24
nvm use 24
```

**Direct download:**

Go to [nodejs.org](https://nodejs.org) and grab the installer for your OS. Make sure it's version 24 or later.

---

## 2. Install Ghostpaw

Pick one of four methods:

### Option A: npx (zero install)

Nothing to install. Just run it:

```bash
npx ghostpaw --version
```

npx downloads the latest version on the fly each time. Good for trying it out.

### Option B: npm global install

```bash
npm install -g ghostpaw
ghostpaw --version
```

Installs the `ghostpaw` command permanently. Updates via `npm update -g ghostpaw`.

### Option C: curl (standalone, handles everything)

```bash
curl -fsSL https://raw.githubusercontent.com/Anonyfox/ghostpaw/main/install.sh | sh
```

The install script handles everything automatically:

- Detects your OS (macOS, Linux, WSL) and architecture
- Checks for Node.js 24+ — if missing or too old, offers to install it via fnm, nvm, or Homebrew (macOS)
- Downloads `ghostpaw.mjs` from the latest GitHub Release into `~/.local/bin/ghostpaw`
- Verifies the install works
- Tells you if your PATH needs updating

You only need `node` on your PATH after setup — npm is not required at runtime.

**Manual download** (if you prefer not to pipe to sh):

```bash
mkdir -p ~/.local/bin
curl -fsSL https://github.com/Anonyfox/ghostpaw/releases/latest/download/ghostpaw.mjs \
  -o ~/.local/bin/ghostpaw
chmod +x ~/.local/bin/ghostpaw
```

Make sure `~/.local/bin` is in your PATH:

```bash
export PATH="$HOME/.local/bin:$PATH"
```

Add that line to your `~/.bashrc`, `~/.zshrc`, or equivalent.

**Pinning a specific version:**

```bash
# Replace v0.8.0 with the version you want
curl -fsSL https://github.com/Anonyfox/ghostpaw/releases/download/v0.8.0/ghostpaw.mjs \
  -o ~/.local/bin/ghostpaw
chmod +x ~/.local/bin/ghostpaw
```

### Option D: Docker (no Node.js required)

If you have Docker installed, you don't need Node.js at all:

```bash
docker run --rm -it \
  -v "$(pwd)":/workspace \
  ghcr.io/anonyfox/ghostpaw
```

This mounts your current directory as the workspace. Ghostpaw stores its database (`.ghostpaw/ghostpaw.db`) and skills in the workspace directory.

**Passing commands:**

```bash
# One-shot prompt
docker run --rm -it \
  -v "$(pwd)":/workspace \
  ghcr.io/anonyfox/ghostpaw run "analyze this project"

# Version check
docker run --rm ghcr.io/anonyfox/ghostpaw --version
```

**Shell alias** (add to your `.bashrc` / `.zshrc`):

```bash
alias ghostpaw='docker run --rm -it -v "$(pwd)":/workspace ghcr.io/anonyfox/ghostpaw'
```

Then just use `ghostpaw` as if it were installed natively.

**Pinning a version:**

```bash
docker run --rm ghcr.io/anonyfox/ghostpaw:0.8.0 --version
```

**File permissions on Linux:** files created by the agent inside `/workspace` are owned by root. If that's a problem, add `--user "$(id -u):$(id -g)"`:

```bash
docker run --rm -it \
  --user "$(id -u):$(id -g)" \
  -v "$(pwd)":/workspace \
  ghcr.io/anonyfox/ghostpaw
```

On macOS and Windows (Docker Desktop), file ownership is handled automatically.

### Windows

The curl install script works inside WSL. For native Windows:

```powershell
winget install OpenJS.NodeJS
npm install -g ghostpaw
```

Or download `ghostpaw.mjs` directly from [GitHub Releases](https://github.com/Anonyfox/ghostpaw/releases/latest) and run with:

```powershell
node ghostpaw.mjs --version
```

---

## 3. Verify

```bash
ghostpaw --version
```

Should print the version number. If you used npx, run `npx ghostpaw --version` instead.

---

## 4. Configure an LLM Provider

Ghostpaw needs an API key from at least one LLM provider to function. It supports **Anthropic**, **OpenAI**, and **xAI** out of the box. Pick whichever you have.

There are three ways to provide the key, depending on your setup:

### Interactive (recommended for first time)

Just run `ghostpaw`. If no key is configured, it detects this automatically and walks you through picking a provider and entering your key. The key is stored locally in `.ghostpaw/ghostpaw.db`, encrypted at rest, and never sent to the LLM in conversation.

```bash
ghostpaw
# → "no API key found — let's set one up"
# → pick a provider, paste your key, done
```

### CLI (scripted or headless)

Use `ghostpaw secrets set` to store a key explicitly. Works with interactive input or piped values:

```bash
# Interactive — prompts for the value
ghostpaw secrets set ANTHROPIC_API_KEY

# Piped — for scripts, CI, automation
echo "sk-ant-..." | ghostpaw secrets set ANTHROPIC_API_KEY
```

Ghostpaw recognizes common env var names and maps them to canonical internal names. `ANTHROPIC_API_KEY`, `OPENAI_API_KEY`, and `XAI_API_KEY` all work.

### Environment variable (servers, Docker, ephemeral)

Set the variable before running. Ghostpaw picks it up at startup, syncs it to the database, and uses it immediately:

```bash
export ANTHROPIC_API_KEY="sk-ant-..."
ghostpaw run "hello"
```

For Docker:

```bash
docker run --rm -it \
  -e ANTHROPIC_API_KEY="sk-ant-..." \
  -v "$(pwd)":/workspace \
  ghcr.io/anonyfox/ghostpaw
```

This is the right approach for servers and containers where you don't want an interactive prompt.

### Optional: search provider

Web search works out of the box via DuckDuckGo. For better reliability, add a key for one of these:

```bash
ghostpaw secrets set BRAVE_API_KEY     # Brave Search
ghostpaw secrets set TAVILY_API_KEY    # Tavily
ghostpaw secrets set SERPER_API_KEY    # Serper
```

### Verify your keys

```bash
ghostpaw secrets list
```

Shows all configured and unconfigured keys with their status.

---

## 5. Enable Channels (optional)

Ghostpaw always starts the TUI when run in a terminal. Two additional channels — web UI and Telegram — are unlocked by setting their respective secrets. All channels run simultaneously from the same process and share the same database.

### Web UI

Set a password to enable the built-in web interface:

```bash
ghostpaw secrets set WEB_UI_PASSWORD
```

Pick any password you like. It gets hashed automatically on first use and is never stored in plaintext.

On next launch, Ghostpaw starts the web UI at `http://127.0.0.1:3000`. Log in with the password you set. The interface gives you chat with real-time streaming, session history, soul inspection, memory search, cost dashboard, and training controls — all from a browser on your phone or desktop.

To change the port:

```bash
export WEB_UI_PORT=8080
```

The web UI only binds to `127.0.0.1` (localhost). To expose it over a network, put it behind a reverse proxy.

### Telegram

To chat with Ghostpaw in Telegram:

1. Open Telegram, find `@BotFather`, send `/newbot`
2. Follow the prompts to name your bot
3. BotFather gives you a token like `123456:ABC-DEF...`
4. Store it:

```bash
ghostpaw secrets set TELEGRAM_BOT_TOKEN
```

On next launch, Ghostpaw connects via long-polling and your bot comes alive. Typing indicators, split replies, and background delegation notifications all work.

To restrict which Telegram chats can talk to your bot (recommended if the bot is public):

```bash
ghostpaw config set telegram_allowed_chat_ids "123456789,987654321"
```

Find your chat ID by sending a message to your bot and checking `ghostpaw sessions list`.

### VPS Quickstart

To provision a fresh VPS (e.g. a DigitalOcean droplet) with one command from your laptop:

```bash
curl -fsSL https://raw.githubusercontent.com/Anonyfox/ghostpaw/main/provision.sh | bash
```

The script walks you through SSH target, LLM provider, and optional channels (Telegram, web UI). It installs Node.js, ghostpaw, stores your secrets, and registers a system service — all in one pass. Pre-set env vars (`HOST`, `ANTHROPIC_API_KEY`, `TELEGRAM_BOT_TOKEN`, `WEB_UI_PASSWORD`) to skip prompts for automation.

---

## 6. Process Reliability (built-in)

Ghostpaw supervises itself. When you run `ghostpaw`, the process automatically forks into a lightweight supervisor and a worker. If the worker crashes, the supervisor restarts it with exponential backoff. No configuration needed — it's active from first run.

What it does:

- **Auto-restart on crash** with exponential backoff (1s, 2s, 4s... up to 30s). Resets after 60s of stable uptime.
- **Heartbeat watchdog** — the worker sends periodic heartbeats. If the supervisor hears nothing for 120s (hung event loop, blocked I/O), it kills and restarts the worker.
- **Single-instance guarantee** — a Unix socket lock prevents two Ghostpaw processes from running in the same workspace. The second one gets a clear error message.
- **Crash circuit breaker** — if the worker crashes 5 times within 2 minutes, the supervisor stops entirely instead of looping.
- **Graceful self-restart** — the agent can restart itself (e.g., after a self-update) by exiting with a special code.

Remote control from a second terminal:

```bash
ghostpaw service restart   # graceful restart
ghostpaw service stop      # graceful shutdown
ghostpaw service status    # PID, uptime, crash count
```

For boot persistence (start Ghostpaw on reboot), register it as a system service:

```bash
ghostpaw service install   # systemd (Linux), launchd (macOS), or cron (fallback)
ghostpaw service uninstall # remove the service
```

The service registration and the built-in supervisor are independent — the supervisor handles crash recovery, the service registration handles boot persistence. Both work together automatically.

To disable the supervisor for debugging:

```bash
GHOSTPAW_NO_SUPERVISOR=1 ghostpaw
```

---

## 7. First Run

```bash
ghostpaw
```

Starts the TUI — the full terminal interface with streaming, scroll, and tool status. If you already configured a key in step 4, it goes straight to chat. If not, it runs the interactive setup first.

For a one-shot prompt without the TUI:

```bash
ghostpaw run "explain what this project does"
```

To see all available commands:

```bash
ghostpaw --help
```

Key subcommands:

```bash
ghostpaw run "..."         # one-shot prompt
ghostpaw secrets           # manage API keys
ghostpaw config            # view/change configuration
ghostpaw souls             # inspect and manage souls
ghostpaw memory            # browse and search memories
ghostpaw pack              # view social bonds
ghostpaw skills            # manage skills (train, stoke, create, validate)
ghostpaw quests            # task and calendar management
ghostpaw costs             # spending dashboard
ghostpaw service install   # register as OS service (auto-start on boot)
ghostpaw service restart   # restart the running process
ghostpaw service stop      # graceful shutdown
ghostpaw service status    # live supervisor status
```

---

## Troubleshooting

**"command not found: ghostpaw"**

- npx: use `npx ghostpaw` instead of bare `ghostpaw`
- npm global: check `npm config get prefix` — its `bin/` subdirectory must be in your PATH
- curl install: ensure `~/.local/bin` is in your PATH (see Option C above)

**"Node.js X.Y is too old"**

Ghostpaw requires Node.js 24+. Upgrade via nvm, fnm, or download from nodejs.org.

**Permission errors on global install**

Don't use `sudo npm install -g`. Fix npm permissions instead:

```bash
mkdir -p ~/.npm-global
npm config set prefix '~/.npm-global'
export PATH="$HOME/.npm-global/bin:$PATH"
```

Add the PATH export to your shell profile.

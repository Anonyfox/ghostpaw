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

This mounts your current directory as the workspace. Ghostpaw stores its database (`ghostpaw.db`) and skills in the workspace directory.

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

## 4. First Run

```bash
ghostpaw
```

On first run, Ghostpaw detects that no API key is configured and walks you through setting one up interactively. After that it starts the TUI — the full terminal interface with streaming, scroll, and tool status.

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
ghostpaw service install   # register as OS service (auto-start + restart)
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

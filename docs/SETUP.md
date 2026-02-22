# Setup Guide

Ghostpaw requires **Node.js 22.5 or later**. That's the only prerequisite.

---

## 1. Install Node.js 22.5+

Check if you already have it:

```bash
node --version
# needs to print v22.5.0 or higher
```

If you need to install or upgrade:

**Using fnm (recommended):**

```bash
curl -fsSL https://fnm.vercel.app/install | bash
fnm install 22
fnm use 22
```

**Using nvm:**

```bash
nvm install 22
nvm use 22
```

**Direct download:**

Go to [nodejs.org](https://nodejs.org) and grab the LTS installer for your OS. Make sure it's version 22.5 or later.

---

## 2. Install Ghostpaw

Pick one of three methods:

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
- Checks for Node.js 22.5+ — if missing or too old, offers to install it via fnm, nvm, or Homebrew (macOS)
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
# Replace v0.1.0 with the version you want
curl -fsSL https://github.com/Anonyfox/ghostpaw/releases/download/v0.1.0/ghostpaw.mjs \
  -o ~/.local/bin/ghostpaw
chmod +x ~/.local/bin/ghostpaw
```

### Option D: Docker (no Node.js required)

If you have Docker installed, you don't need Node.js at all:

```bash
docker run --rm -it \
  -v "$(pwd)":/workspace \
  -v ~/.ghostpaw:/root/.ghostpaw \
  ghcr.io/anonyfox/ghostpaw
```

This mounts:

- **Your current directory** → `/workspace` — the project the agent works on
- **~/.ghostpaw** → `/root/.ghostpaw` — persistent config, sessions, extensions

The image is from GitHub Container Registry (`ghcr.io/anonyfox/ghostpaw`), multi-arch (amd64 + arm64), and auto-published on every release.

**Passing commands:**

```bash
# One-shot prompt
docker run --rm -it \
  -v "$(pwd)":/workspace \
  -v ~/.ghostpaw:/root/.ghostpaw \
  ghcr.io/anonyfox/ghostpaw run "analyze this project"

# Init workspace
docker run --rm -it \
  -v ~/.ghostpaw:/root/.ghostpaw \
  ghcr.io/anonyfox/ghostpaw init

# Version check
docker run --rm ghcr.io/anonyfox/ghostpaw --version
```

**Shell alias** (add to your `.bashrc` / `.zshrc`):

```bash
alias ghostpaw='docker run --rm -it -v "$(pwd)":/workspace -v ~/.ghostpaw:/root/.ghostpaw ghcr.io/anonyfox/ghostpaw'
```

Then just use `ghostpaw` as if it were installed natively.

**Pinning a version:**

```bash
docker run --rm ghcr.io/anonyfox/ghostpaw:0.1.0 --version
```

**File permissions on Linux:** files created by the agent inside `/workspace` are owned by root. If that's a problem, add `--user "$(id -u):$(id -g)"`:

```bash
docker run --rm -it \
  --user "$(id -u):$(id -g)" \
  -v "$(pwd)":/workspace \
  -v ~/.ghostpaw:/tmp/.ghostpaw \
  ghcr.io/anonyfox/ghostpaw
```

On macOS and Windows (Docker Desktop), file ownership is handled automatically.

### Windows

The curl install script works inside WSL. For native Windows:

```powershell
winget install OpenJS.NodeJS --version 22.12.0
npm install -g ghostpaw
```

Or download `ghostpaw.mjs` directly from [GitHub Releases](https://github.com/Anonyfox/ghostpaw/releases/latest) and run with:

```powershell
node --experimental-sqlite ghostpaw.mjs --version
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
ghostpaw init
```

This creates the workspace at `~/.ghostpaw/` and walks you through setting up your LLM API key. After that:

```bash
ghostpaw          # interactive chat
ghostpaw --help   # see all commands
```

---

## Troubleshooting

**"command not found: ghostpaw"**

- npx: use `npx ghostpaw` instead of bare `ghostpaw`
- npm global: check `npm config get prefix` — its `bin/` subdirectory must be in your PATH
- curl install: ensure `~/.local/bin` is in your PATH (see Option C above)

**"Node.js X.Y is too old"**

Ghostpaw requires Node.js 22.5+. Upgrade via nvm, fnm, or download from nodejs.org.

**Permission errors on global install**

Don't use `sudo npm install -g`. Fix npm permissions instead:

```bash
mkdir -p ~/.npm-global
npm config set prefix '~/.npm-global'
export PATH="$HOME/.npm-global/bin:$PATH"
```

Add the PATH export to your shell profile.

**"--experimental-sqlite" warnings**

Normal. Node's SQLite module is experimental in the 22.x line. Ghostpaw enables the flag automatically when run as a CLI. If you're using it as a library, pass the flag yourself:

```bash
node --experimental-sqlite your-script.mjs
```

Or set it globally:

```bash
export NODE_OPTIONS="--experimental-sqlite"
```

#!/bin/sh
# shellcheck disable=SC1091
set -e

# ── Ghostpaw installer ──────────────────────────────────────────────────────
# Downloads and installs ghostpaw. Installs Node.js 24+ if missing.
#
# Usage:
#   curl -fsSL https://raw.githubusercontent.com/Anonyfox/ghostpaw/main/install.sh | sh
#
# Environment variables:
#   GHOSTPAW_INSTALL_DIR  where to put the ghostpaw binary (default: ~/.local/bin)
#   SKIP_NODE_INSTALL     set to 1 to skip automatic Node.js installation
# ─────────────────────────────────────────────────────────────────────────────

REPO="Anonyfox/ghostpaw"
INSTALL_DIR="${GHOSTPAW_INSTALL_DIR:-$HOME/.local/bin}"
MIN_NODE_MAJOR=24
MIN_NODE_MINOR=0
REQUIRED_NODE="${MIN_NODE_MAJOR}.${MIN_NODE_MINOR}.0"

# ── Colors (disabled if not a terminal) ──────────────────────────────────────

if [ -t 1 ]; then
  RED='\033[0;31m'
  GREEN='\033[0;32m'
  YELLOW='\033[0;33m'
  BLUE='\033[0;34m'
  DIM='\033[0;90m'
  BOLD='\033[1m'
  RESET='\033[0m'
else
  RED='' GREEN='' YELLOW='' BLUE='' DIM='' BOLD='' RESET=''
fi

error() { printf "\n%sERROR:%s %s\n\n" "${RED}${BOLD}" "${RESET}" "$1" >&2; exit 1; }
warn()  { printf "  %s!%s %s\n" "${YELLOW}" "${RESET}" "$1"; }
info()  { printf "  %s%s%s\n" "${DIM}" "$1" "${RESET}"; }
ok()    { printf "  %s✓%s %s\n" "${GREEN}" "${RESET}" "$1"; }
step()  { printf "\n%s[%s/%s]%s %s%s%s\n" "${BLUE}${BOLD}" "$1" "$TOTAL_STEPS" "${RESET}" "${BOLD}" "$2" "${RESET}"; }

TOTAL_STEPS=4

# ── User prompt (works even when piped via curl | sh) ────────────────────────

confirm() {
  printf "  %s%s%s [Y/n] " "${BOLD}" "$1" "${RESET}"
  if [ ! -t 0 ]; then
    read -r answer < /dev/tty 2>/dev/null || answer="y"
  else
    read -r answer
  fi
  case "$answer" in
    [nN]*) return 1 ;;
    *) return 0 ;;
  esac
}

# ── Helpers ──────────────────────────────────────────────────────────────────

has_cmd() { command -v "$1" >/dev/null 2>&1; }

# Download a URL to a file. Uses curl or wget, whichever is available.
download() {
  URL="$1"
  DEST="$2"
  if has_cmd curl; then
    curl -fsSL --retry 3 --retry-delay 2 "$URL" -o "$DEST"
  elif has_cmd wget; then
    wget -qO "$DEST" "$URL"
  else
    error "Neither curl nor wget found. Install one and retry."
  fi
}

# ── OS detection ─────────────────────────────────────────────────────────────

detect_os() {
  OS_TYPE="unknown"
  OS_NAME="unknown"
  ARCH=$(uname -m)

  case "$(uname -s)" in
    Darwin)
      OS_TYPE="macos"
      OS_NAME="macOS $(sw_vers -productVersion 2>/dev/null || echo '?')"
      ;;
    Linux)
      OS_TYPE="linux"
      if [ -f /proc/version ] && grep -qi microsoft /proc/version 2>/dev/null; then
        OS_TYPE="wsl"
      fi
      if [ -f /etc/os-release ]; then
        . /etc/os-release
        OS_NAME="${PRETTY_NAME:-Linux}"
      elif [ -f /etc/alpine-release ]; then
        OS_NAME="Alpine $(cat /etc/alpine-release)"
      else
        OS_NAME="Linux"
      fi
      ;;
    FreeBSD)
      OS_TYPE="freebsd"
      OS_NAME="FreeBSD $(freebsd-version 2>/dev/null || echo '?')"
      ;;
    MINGW*|MSYS*|CYGWIN*)
      OS_TYPE="windows_shell"
      OS_NAME="Windows ($(uname -s))"
      ;;
    *)
      OS_TYPE="unknown"
      OS_NAME="$(uname -s)"
      ;;
  esac

  info "${OS_NAME} (${ARCH})"

  if [ "$OS_TYPE" = "windows_shell" ]; then
    echo ""
    warn "You're running this in a Windows shell emulator (${OS_NAME})."
    echo ""
    echo "  For the best experience on Windows, use one of:"
    echo ""
    echo "    1. WSL (recommended):"
    echo "       wsl --install"
    echo "       # then run this installer again inside WSL"
    echo ""
    echo "    2. Native Windows install:"
    echo "       winget install OpenJS.NodeJS --version ${REQUIRED_NODE}"
    echo "       npm install -g ghostpaw"
    echo ""
    echo "    3. Download directly:"
    echo "       https://github.com/${REPO}/releases/latest/download/ghostpaw.mjs"
    echo ""
    error "Cannot continue in this environment. Use one of the options above."
  fi
}

# ── Node.js version check ───────────────────────────────────────────────────

node_version_ok() {
  if ! has_cmd node; then
    return 1
  fi

  NODE_RAW=$(node --version 2>/dev/null) || return 1
  NODE_VERSION=$(echo "$NODE_RAW" | sed 's/^v//')

  # Validate it looks like a version number
  case "$NODE_VERSION" in
    [0-9]*.[0-9]*.[0-9]*) ;;
    *) return 1 ;;
  esac

  NODE_MAJOR=$(echo "$NODE_VERSION" | cut -d. -f1)
  NODE_MINOR=$(echo "$NODE_VERSION" | cut -d. -f2)

  [ "$NODE_MAJOR" -gt "$MIN_NODE_MAJOR" ] 2>/dev/null && return 0
  [ "$NODE_MAJOR" -eq "$MIN_NODE_MAJOR" ] 2>/dev/null && \
    [ "$NODE_MINOR" -ge "$MIN_NODE_MINOR" ] 2>/dev/null && return 0

  return 1
}

# ── Node.js installation strategies ─────────────────────────────────────────

try_fnm() {
  has_cmd fnm || return 1
  info "Found fnm — installing Node.js ${MIN_NODE_MAJOR}..."
  if ! fnm install "$MIN_NODE_MAJOR"; then
    warn "fnm install failed"
    return 1
  fi
  eval "$(fnm env)" 2>/dev/null || true
  # Verify fnm actually put node on PATH
  has_cmd node || return 1
  return 0
}

try_nvm() {
  NVM_DIR="${NVM_DIR:-$HOME/.nvm}"
  [ -s "$NVM_DIR/nvm.sh" ] || return 1
  info "Found nvm — installing Node.js ${MIN_NODE_MAJOR}..."
  . "$NVM_DIR/nvm.sh"
  if ! nvm install "$MIN_NODE_MAJOR"; then
    warn "nvm install failed"
    return 1
  fi
  has_cmd node || return 1
  return 0
}

try_volta() {
  has_cmd volta || return 1
  info "Found volta — installing Node.js ${MIN_NODE_MAJOR}..."
  if ! volta install "node@${MIN_NODE_MAJOR}"; then
    warn "volta install failed"
    return 1
  fi
  has_cmd node || return 1
  return 0
}

try_brew() {
  has_cmd brew || return 1
  info "Found Homebrew — installing node@${MIN_NODE_MAJOR}..."
  if ! brew install "node@${MIN_NODE_MAJOR}"; then
    warn "brew install failed"
    return 1
  fi

  # Homebrew keg-only: add to PATH for this session
  BREW_NODE_PREFIX="$(brew --prefix "node@${MIN_NODE_MAJOR}" 2>/dev/null || true)"
  if [ -n "$BREW_NODE_PREFIX" ] && [ -d "${BREW_NODE_PREFIX}/bin" ]; then
    export PATH="${BREW_NODE_PREFIX}/bin:$PATH"
    info "Added ${BREW_NODE_PREFIX}/bin to PATH for this session"
    echo ""
    warn "Homebrew's node@${MIN_NODE_MAJOR} is keg-only. Make it permanent:"
    detect_shell_profile
    echo ""
    echo "    echo 'export PATH=\"${BREW_NODE_PREFIX}/bin:\$PATH\"' >> ${PROFILE}"
    echo ""
  fi

  has_cmd node || return 1
  return 0
}

install_fnm_then_node() {
  info "No suitable Node.js version manager found."
  info "fnm (Fast Node Manager) can install Node.js cleanly without touching system packages."
  echo ""

  if ! confirm "Install fnm and Node.js ${MIN_NODE_MAJOR}?"; then
    print_manual_install_options
    error "Node.js >= ${REQUIRED_NODE} is required."
  fi

  info "Downloading fnm..."

  # Download fnm installer — run directly, don't pipe through while (preserves exit code)
  TMPFILE=$(mktemp)
  if ! download "https://fnm.vercel.app/install" "$TMPFILE"; then
    rm -f "$TMPFILE"
    error "Failed to download fnm installer. Check your internet connection."
  fi
  if ! bash "$TMPFILE" --skip-shell; then
    rm -f "$TMPFILE"
    error "fnm installation failed. Try installing Node.js manually:
  https://nodejs.org"
  fi
  rm -f "$TMPFILE"

  # Find the fnm binary
  FNM_BIN=""
  for candidate in \
    "$HOME/.local/share/fnm/fnm" \
    "$HOME/.fnm/fnm" \
    "$HOME/.local/bin/fnm" \
    "$HOME/.cargo/bin/fnm"; do
    if [ -x "$candidate" ]; then
      FNM_BIN="$candidate"
      break
    fi
  done

  if [ -z "$FNM_BIN" ]; then
    hash -r 2>/dev/null || true
    if has_cmd fnm; then
      FNM_BIN="fnm"
    else
      error "fnm was downloaded but could not be found.
  Checked: ~/.local/share/fnm, ~/.fnm, ~/.local/bin, ~/.cargo/bin
  Try opening a new terminal and running this installer again."
    fi
  fi

  ok "fnm installed at ${FNM_BIN}"
  info "Installing Node.js ${MIN_NODE_MAJOR}..."

  if ! "$FNM_BIN" install "$MIN_NODE_MAJOR"; then
    error "Failed to install Node.js ${MIN_NODE_MAJOR} via fnm.
  Try manually: fnm install ${MIN_NODE_MAJOR}"
  fi
  eval "$("$FNM_BIN" env)" 2>/dev/null || true

  if ! has_cmd node; then
    error "fnm installed Node.js but 'node' is not on PATH.
  Run this in your terminal and try again:
    eval \"\$(fnm env)\""
  fi

  ok "Node.js $(node --version) installed via fnm"

  # Shell integration hint
  SHELL_NAME=$(basename "${SHELL:-/bin/sh}")
  echo ""
  info "To keep Node.js available in future shell sessions, run ONE of these:"
  echo ""
  case "$SHELL_NAME" in
    zsh)
      echo "    echo 'eval \"\$(fnm env --use-on-cd --shell zsh)\"' >> ~/.zshrc"
      ;;
    bash)
      echo "    echo 'eval \"\$(fnm env --use-on-cd --shell bash)\"' >> ~/.bashrc"
      ;;
    fish)
      echo "    echo 'fnm env --use-on-cd --shell fish | source' >> ~/.config/fish/config.fish"
      ;;
    *)
      echo "    # Add to your shell profile:"
      echo "    eval \"\$(fnm env --use-on-cd)\""
      ;;
  esac
  echo ""
}

print_manual_install_options() {
  echo ""
  echo "  Install Node.js ${REQUIRED_NODE}+ manually using any of these:"
  echo ""
  echo "    nodejs.org   — https://nodejs.org (download installer)"
  echo "    fnm          — curl -fsSL https://fnm.vercel.app/install | bash"
  echo "    nvm          — curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.40.1/install.sh | bash"
  case "$OS_TYPE" in
    macos)
      echo "    Homebrew     — brew install node@${MIN_NODE_MAJOR}"
      ;;
    linux|wsl)
      if has_cmd apt-get; then
        echo "    NodeSource   — https://github.com/nodesource/distributions#debian-and-ubuntu"
      elif has_cmd dnf; then
        echo "    NodeSource   — https://github.com/nodesource/distributions#fedora"
      elif has_cmd pacman; then
        echo "    pacman       — sudo pacman -S nodejs npm"
      elif has_cmd apk; then
        echo "    apk          — sudo apk add nodejs npm"
      fi
      if has_cmd brew; then
        echo "    Homebrew     — brew install node@${MIN_NODE_MAJOR}"
      fi
      ;;
  esac
  echo ""
  echo "  Then re-run this installer."
}

# ── Orchestrator: try strategies in order of least invasiveness ──────────────

install_node() {
  if [ "${SKIP_NODE_INSTALL:-0}" = "1" ]; then
    error "Node.js >= ${REQUIRED_NODE} is required but SKIP_NODE_INSTALL is set.
  Install it manually and retry."
  fi

  if has_cmd node; then
    warn "Found Node.js $(node --version), but need >= v${REQUIRED_NODE}"
  else
    info "Node.js is not installed"
  fi
  echo ""

  # 1. Existing version managers (no new software, cleanest option)
  if try_fnm;  then return 0; fi
  if try_nvm;  then return 0; fi
  if try_volta; then return 0; fi

  # 2. System package manager with Node support (Homebrew on macOS or Linux)
  if try_brew; then return 0; fi

  # 3. Last resort: install fnm from scratch, then use it
  install_fnm_then_node
}

# ── Download ghostpaw ────────────────────────────────────────────────────────

download_ghostpaw() {
  DOWNLOAD_URL="https://github.com/${REPO}/releases/latest/download/ghostpaw.mjs"
  TARGET="${INSTALL_DIR}/ghostpaw"
  info "Downloading from GitHub Releases..."

  # Ensure install directory exists
  if ! mkdir -p "$INSTALL_DIR" 2>/dev/null; then
    error "Cannot create directory ${INSTALL_DIR}
  Check permissions, or set GHOSTPAW_INSTALL_DIR to a writable location:
    GHOSTPAW_INSTALL_DIR=/your/path curl -fsSL ... | sh"
  fi

  # Download to a temp file first (atomic: no partial file on failure)
  TMPFILE="${TARGET}.tmp.$$"
  trap 'rm -f "$TMPFILE"' EXIT

  if ! download "$DOWNLOAD_URL" "$TMPFILE"; then
    rm -f "$TMPFILE"
    error "Download failed. This usually means:
  • No internet connection
  • No GitHub release exists yet (the project may not have published one)

  Check: https://github.com/${REPO}/releases

  If there are no releases yet, install via npm instead:
    npm install -g ghostpaw"
  fi

  # Validate the download is actually a JavaScript file (not an HTML error page)
  FIRST_LINE=$(head -c 100 "$TMPFILE" 2>/dev/null || true)
  case "$FIRST_LINE" in
    "#!/"*|"import "*|"var "*|"const "*|"let "*)
      # Looks like JS
      ;;
    "<!DOCTYPE"*|"<html"*|"<HTML"*|*"404"*|"Not Found"*)
      rm -f "$TMPFILE"
      error "Downloaded file is not valid (got an HTML page instead of JavaScript).
  The release may not exist. Check: https://github.com/${REPO}/releases

  Install via npm instead:
    npm install -g ghostpaw"
      ;;
    "")
      rm -f "$TMPFILE"
      error "Downloaded file is empty. Try again, or install via npm:
    npm install -g ghostpaw"
      ;;
  esac

  mv "$TMPFILE" "$TARGET"
  chmod +x "$TARGET"
  ok "Downloaded to ${TARGET}"
}

# ── PATH check & shell profile detection ─────────────────────────────────────

detect_shell_profile() {
  SHELL_NAME=$(basename "${SHELL:-/bin/sh}")
  case "$SHELL_NAME" in
    zsh)
      PROFILE="$HOME/.zshrc"
      ;;
    bash)
      # macOS uses .bash_profile for login shells; Linux uses .bashrc
      if [ -f "$HOME/.bash_profile" ]; then
        PROFILE="$HOME/.bash_profile"
      else
        PROFILE="$HOME/.bashrc"
      fi
      ;;
    fish)
      PROFILE="$HOME/.config/fish/config.fish"
      ;;
    *)
      PROFILE="$HOME/.profile"
      ;;
  esac
}

check_path() {
  case ":${PATH}:" in
    *":${INSTALL_DIR}:"*)
      return 0
      ;;
    *)
      detect_shell_profile
      warn "${INSTALL_DIR} is not in your PATH"
      echo ""
      echo "  Fix it now (takes effect immediately + persists):"
      echo ""
      if [ "$(basename "${SHELL:-}")" = "fish" ]; then
        echo "    fish_add_path ${INSTALL_DIR}"
      else
        echo "    echo 'export PATH=\"${INSTALL_DIR}:\$PATH\"' >> ${PROFILE} && source ${PROFILE}"
      fi
      echo ""
      return 1
      ;;
  esac
}

# ── Main ─────────────────────────────────────────────────────────────────────

main() {
  printf "\n%sGhostpaw Installer%s\n" "${BOLD}" "${RESET}"

  # ── Step 1: Detect system ──
  step 1 "Detecting your system"
  detect_os

  # ── Step 2: Ensure Node.js ──
  step 2 "Checking Node.js (need >= ${REQUIRED_NODE})"
  if node_version_ok; then
    ok "Node.js v${NODE_VERSION}"
  else
    install_node

    # Re-check after install
    if node_version_ok; then
      ok "Node.js v${NODE_VERSION} — ready"
    else
      echo ""
      echo "  Node.js still not available or too old after installation attempt."
      echo ""
      echo "  This usually means your current shell session hasn't picked up the"
      echo "  new installation. Try these steps:"
      echo ""
      echo "    1. Open a new terminal window"
      echo "    2. Run:  node --version       (should print v${REQUIRED_NODE} or later)"
      echo "    3. Re-run this installer"
      echo ""
      echo "  If that doesn't work, install Node.js manually:"
      print_manual_install_options
      error "Node.js >= ${REQUIRED_NODE} is required."
    fi
  fi

  # ── Step 3: Download ghostpaw ──
  step 3 "Installing ghostpaw"
  download_ghostpaw

  # ── Step 4: Verify ──
  step 4 "Verifying installation"

  INSTALLED_VERSION=$("${INSTALL_DIR}/ghostpaw" --version 2>/dev/null) || true

  if [ -z "$INSTALLED_VERSION" ]; then
    # Try to give a useful diagnosis
    if ! has_cmd node; then
      error "node is not on PATH. Open a new terminal and retry."
    fi
    NODE_V=$(node --version 2>/dev/null || echo "unknown")
    error "Could not run ghostpaw (node ${NODE_V}).
  Try manually:  node ${INSTALL_DIR}/ghostpaw --version"
  fi

  ok "ghostpaw v${INSTALLED_VERSION}"

  # ── Done ──
  echo ""
  PATH_OK=true
  check_path || PATH_OK=false

  printf "\n%sDone!%s\n\n" "${GREEN}${BOLD}" "${RESET}"
  echo "  Get started:"
  echo ""
  if [ "$PATH_OK" = true ]; then
    echo "    ghostpaw                   # interactive chat (auto-setup on first run)"
    echo "    ghostpaw run \"do the thing\" # one-shot prompt"
    echo "    ghostpaw service install   # register as OS service (auto-start + restart)"
    echo "    ghostpaw --help            # see all commands"
  else
    echo "    ${INSTALL_DIR}/ghostpaw                   # interactive chat (auto-setup on first run)"
    echo "    ${INSTALL_DIR}/ghostpaw run \"do the thing\" # one-shot prompt"
    echo "    ${INSTALL_DIR}/ghostpaw service install   # register as OS service"
    echo "    ${INSTALL_DIR}/ghostpaw --help            # see all commands"
  fi
  echo ""
  echo "  Docs:  https://github.com/${REPO}"
  echo ""
}

main "$@"

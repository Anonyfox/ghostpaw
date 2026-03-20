#!/usr/bin/env bash
# shellcheck disable=SC1091
set -euo pipefail

# ── Ghostpaw VPS Provisioning ───────────────────────────────────────────────
# Provisions a remote VPS with ghostpaw: installs the binary, stores secrets,
# and registers as a system service. Run from your laptop:
#
#   curl -fsSL https://raw.githubusercontent.com/Anonyfox/ghostpaw/main/provision.sh | bash
#
# Pre-set any of these env vars to skip the corresponding prompt:
#   HOST                 SSH target (e.g. root@123.45.67.89)
#   ANTHROPIC_API_KEY    Anthropic API key
#   OPENAI_API_KEY       OpenAI API key
#   XAI_API_KEY          xAI API key
#   TELEGRAM_BOT_TOKEN   Telegram bot token (from @BotFather)
#   WEB_UI_PASSWORD      Password for the web dashboard
# ─────────────────────────────────────────────────────────────────────────────

REPO="Anonyfox/ghostpaw"

# ── Colors (disabled if not a terminal) ──────────────────────────────────────

if [ -t 1 ] || [ -t 2 ]; then
  RED='\033[0;31m'
  GREEN='\033[0;32m'
  YELLOW='\033[0;33m'
  BLUE='\033[0;34m'
  CYAN='\033[0;36m'
  DIM='\033[0;90m'
  BOLD='\033[1m'
  RESET='\033[0m'
else
  RED='' GREEN='' YELLOW='' CYAN='' BLUE='' DIM='' BOLD='' RESET=''
fi

TOTAL_STEPS=4

error() { printf "\n%sERROR:%s %s\n\n" "${RED}${BOLD}" "${RESET}" "$1" >&2; exit 1; }
warn()  { printf "  %s!%s %s\n" "${YELLOW}" "${RESET}" "$1"; }
info()  { printf "  %s%s%s\n" "${DIM}" "$1" "${RESET}"; }
ok()    { printf "  %s✓%s %s\n" "${GREEN}" "${RESET}" "$1"; }
step()  { printf "\n%s[%s/%s]%s %s%s%s\n" "${BLUE}${BOLD}" "$1" "$TOTAL_STEPS" "${RESET}" "${BOLD}" "$2" "${RESET}"; }

# ── Input helpers (read from /dev/tty for curl|bash compatibility) ───────────

STTY_MODIFIED=false

cleanup() {
  if [ "$STTY_MODIFIED" = true ]; then
    stty echo < /dev/tty 2>/dev/null || true
    STTY_MODIFIED=false
  fi
}
trap cleanup EXIT INT TERM

ask() {
  local prompt="$1" default="${2:-}"
  if [ -n "$default" ]; then
    printf "  %s [%s]: " "$prompt" "$default" > /dev/tty
  else
    printf "  %s: " "$prompt" > /dev/tty
  fi
  local value
  read -r value < /dev/tty 2>/dev/null || value=""
  echo "${value:-$default}"
}

ask_secret() {
  local prompt="$1"
  printf "  %s: " "$prompt" > /dev/tty
  STTY_MODIFIED=true
  stty -echo < /dev/tty 2>/dev/null || true
  local value
  read -r value < /dev/tty 2>/dev/null || value=""
  stty echo < /dev/tty 2>/dev/null || true
  STTY_MODIFIED=false
  printf "\n" > /dev/tty
  echo "$value"
}

confirm() {
  printf "  %s%s%s [Y/n] " "${BOLD}" "$1" "${RESET}" > /dev/tty
  local answer
  read -r answer < /dev/tty 2>/dev/null || answer="y"
  case "$answer" in
    [nN]*) return 1 ;;
    *) return 0 ;;
  esac
}

# ── Platform check ───────────────────────────────────────────────────────────

case "$(uname -s)" in
  MINGW*|MSYS*|CYGWIN*)
    error "This script requires WSL or Git Bash on Windows.
  Install WSL:  wsl --install
  Then re-run this script inside WSL."
    ;;
esac

# ── Main ─────────────────────────────────────────────────────────────────────

printf "\n%sGhostpaw Provisioning%s\n" "${BOLD}" "${RESET}"

# ── [1/4] VPS target ────────────────────────────────────────────────────────

step 1 "VPS target"

HOST="${HOST:-}"

if [ -n "$HOST" ]; then
  info "Using HOST from environment: $HOST"
else
  HOST=$(ask "SSH address (e.g. root@123.45.67.89)")
  if [ -z "$HOST" ]; then
    error "No SSH address provided."
  fi
fi

case "$HOST" in
  *@*) ;;
  *) HOST="root@$HOST" ;;
esac

if ssh -o ConnectTimeout=10 -o BatchMode=yes "$HOST" true 2>/dev/null; then
  ok "connected to $HOST"
else
  warn "SSH key auth not available — SSH will prompt for password during deploy"
fi

# ── [2/4] LLM provider ──────────────────────────────────────────────────────

step 2 "LLM provider"

API_KEY_NAME=""
API_KEY_VALUE=""

if [ -n "${ANTHROPIC_API_KEY:-}" ]; then
  API_KEY_NAME="ANTHROPIC_API_KEY"
  API_KEY_VALUE="$ANTHROPIC_API_KEY"
  info "Using ANTHROPIC_API_KEY from environment"
elif [ -n "${OPENAI_API_KEY:-}" ]; then
  API_KEY_NAME="OPENAI_API_KEY"
  API_KEY_VALUE="$OPENAI_API_KEY"
  info "Using OPENAI_API_KEY from environment"
elif [ -n "${XAI_API_KEY:-}" ]; then
  API_KEY_NAME="XAI_API_KEY"
  API_KEY_VALUE="$XAI_API_KEY"
  info "Using XAI_API_KEY from environment"
else
  printf "  Which provider?\n" > /dev/tty
  printf "    %s[1]%s Anthropic %s(recommended)%s\n" "${CYAN}" "${RESET}" "${DIM}" "${RESET}" > /dev/tty
  printf "    %s[2]%s OpenAI\n" "${CYAN}" "${RESET}" > /dev/tty
  printf "    %s[3]%s xAI\n" "${CYAN}" "${RESET}" > /dev/tty

  CHOICE=$(ask "Choice" "1")
  case "$CHOICE" in
    2) API_KEY_NAME="OPENAI_API_KEY" ;;
    3) API_KEY_NAME="XAI_API_KEY" ;;
    *) API_KEY_NAME="ANTHROPIC_API_KEY" ;;
  esac

  API_KEY_VALUE=$(ask_secret "API key for $API_KEY_NAME")
  if [ -z "$API_KEY_VALUE" ]; then
    error "API key cannot be empty."
  fi
fi

ok "$API_KEY_NAME configured"

# ── [3/4] Channels ──────────────────────────────────────────────────────────

step 3 "Channels"

TG_TOKEN="${TELEGRAM_BOT_TOKEN:-}"

if [ -n "$TG_TOKEN" ]; then
  info "Using TELEGRAM_BOT_TOKEN from environment"
else
  TG_TOKEN=$(ask_secret "Telegram bot token (from @BotFather, Enter to skip)")
fi

if [ -n "$TG_TOKEN" ]; then
  ok "Telegram configured"
else
  info "Telegram skipped"
fi

WEB_PW="${WEB_UI_PASSWORD:-}"

if [ -n "$WEB_PW" ]; then
  info "Using WEB_UI_PASSWORD from environment"
else
  WEB_PW=$(ask_secret "Web dashboard password (Enter to skip)")
fi

if [ -n "$WEB_PW" ]; then
  ok "Web dashboard configured"
else
  info "Web dashboard skipped"
fi

# ── Summary ──────────────────────────────────────────────────────────────────

echo ""
info "Ready to deploy ghostpaw:"
info "  Target:    $HOST"
info "  LLM:       $API_KEY_NAME"
info "  Telegram:  $([ -n "$TG_TOKEN" ] && echo "yes" || echo "no")"
info "  Web UI:    $([ -n "$WEB_PW" ] && echo "yes" || echo "no")"

if ! confirm "Continue?"; then
  echo ""
  info "Cancelled."
  exit 0
fi

# ── [4/4] Deploy ─────────────────────────────────────────────────────────────

step 4 "Deploying to $HOST"

INSTALL_URL="https://raw.githubusercontent.com/${REPO}/main/install.sh"
GP="\$HOME/.local/bin/ghostpaw"

# Build the secrets injection commands
SECRET_CMDS=""
SECRET_CMDS="${SECRET_CMDS}echo '${API_KEY_VALUE}' | ${GP} secrets set ${API_KEY_NAME}\n"

if [ -n "$TG_TOKEN" ]; then
  SECRET_CMDS="${SECRET_CMDS}echo '${TG_TOKEN}' | ${GP} secrets set TELEGRAM_BOT_TOKEN\n"
fi

if [ -n "$WEB_PW" ]; then
  SECRET_CMDS="${SECRET_CMDS}echo '${WEB_PW}' | ${GP} secrets set WEB_UI_PASSWORD\n"
fi

info "Installing Node.js + ghostpaw..."

# The heredoc delimiter is unquoted so local variables expand.
# Remote variables ($HOME) are escaped with backslash.
ssh "$HOST" bash <<REMOTE
set -euo pipefail

# Install ghostpaw (handles Node.js too)
curl -fsSL "${INSTALL_URL}" | sh
export PATH="\$HOME/.local/bin:\$PATH"

# Source /etc/environment for node PATH (install.sh updates it on Linux)
[ -f /etc/environment ] && . /etc/environment && export PATH

# Ensure systemd --user works in non-interactive SSH
export XDG_RUNTIME_DIR="\${XDG_RUNTIME_DIR:-/run/user/\$(id -u)}"

# Store secrets
$(printf '%b' "$SECRET_CMDS")

# Register as system service
${GP} service install

REMOTE

ok "ghostpaw installed and secrets stored"

info "Verifying service..."

VERIFY_OUTPUT=$(ssh "$HOST" "XDG_RUNTIME_DIR=\${XDG_RUNTIME_DIR:-/run/user/\$(id -u)} systemctl --user is-active ghostpaw.service 2>/dev/null || echo 'inactive'")

if [ "$VERIFY_OUTPUT" = "active" ]; then
  ok "ghostpaw is running"
else
  warn "service status: $VERIFY_OUTPUT"
  info "Check logs: ssh $HOST 'journalctl --user -u ghostpaw -n 30'"
fi

# ── Done ─────────────────────────────────────────────────────────────────────

printf "\n%sDone!%s\n\n" "${GREEN}${BOLD}" "${RESET}"

if [ -n "$TG_TOKEN" ]; then
  echo "  Open Telegram and talk to your bot."
else
  echo "  SSH in and run: ghostpaw"
fi

echo ""
echo "  Useful commands (on the VPS):"
echo "    ghostpaw service status    # check if running"
echo "    ghostpaw service logs      # view logs"
echo "    ghostpaw service restart   # restart"
echo ""
echo "  Docs: https://github.com/${REPO}"
echo ""

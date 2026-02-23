/**
 * Minimal terminal formatting. Respects NO_COLOR, non-TTY pipes, and
 * FORCE_COLOR. No dependencies — just ANSI escape codes with graceful
 * degradation to plain text.
 *
 * Inspired by cargo/esbuild: labeled lines, dim secondary info, no emoji.
 */

function supportsColor(): boolean {
  if (process.env.FORCE_COLOR !== undefined && process.env.FORCE_COLOR !== "0") return true;
  if (process.env.NO_COLOR !== undefined) return false;
  if (!process.stdout.isTTY) return false;
  if (process.env.TERM === "dumb") return false;
  return true;
}

const enabled = supportsColor();

const code = (n: number) => (enabled ? `\x1b[${n}m` : "");
const reset = code(0);

export const style = {
  bold: (s: string) => `${code(1)}${s}${reset}`,
  dim: (s: string) => `${code(2)}${s}${reset}`,
  italic: (s: string) => `${code(3)}${s}${reset}`,
  red: (s: string) => `${code(31)}${s}${reset}`,
  green: (s: string) => `${code(32)}${s}${reset}`,
  yellow: (s: string) => `${code(33)}${s}${reset}`,
  cyan: (s: string) => `${code(36)}${s}${reset}`,
  boldCyan: (s: string) => `${code(1)}${code(36)}${s}${reset}`,
  boldGreen: (s: string) => `${code(1)}${code(32)}${s}${reset}`,
  boldRed: (s: string) => `${code(1)}${code(31)}${s}${reset}`,
  boldYellow: (s: string) => `${code(1)}${code(33)}${s}${reset}`,
};

/**
 * Labeled log line, cargo-style:
 *   "  created  config.json"
 *   "  warning  No API key configured"
 *
 * Label is right-padded to 10 chars for alignment.
 */
export function label(tag: string, message: string, colorFn?: (s: string) => string): void {
  const padded = tag.padStart(10);
  const styled = colorFn ? colorFn(padded) : style.bold(padded);
  console.log(`${styled}  ${message}`);
}

export const log = {
  created: (msg: string) => label("created", msg, style.boldGreen),
  exists: (msg: string) => label("exists", msg, style.dim),
  done: (msg: string) => label("done", msg, style.boldGreen),
  info: (msg: string) => label("info", msg, style.boldCyan),
  warn: (msg: string) => label("warning", msg, style.boldYellow),
  error: (msg: string) => label("error", msg, style.boldRed),
  step: (msg: string) => label("", msg),
};

export function banner(name: string, version: string): void {
  console.log(`${style.bold(name)} ${style.dim(`v${version}`)}`);
}

export function blank(): void {
  console.log("");
}

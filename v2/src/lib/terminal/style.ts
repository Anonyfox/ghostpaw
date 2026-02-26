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

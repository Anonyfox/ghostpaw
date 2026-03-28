const esc = (code: string) => `\x1b[${code}m`;
const wrap = (open: string, close: string) => (text: string) => `${esc(open)}${text}${esc(close)}`;

export const bold = wrap("1", "22");
export const dim = wrap("2", "22");
export const italic = wrap("3", "23");
export const underline = wrap("4", "24");
export const red = wrap("31", "39");
export const green = wrap("32", "39");
export const yellow = wrap("33", "39");
export const blue = wrap("34", "39");
export const magenta = wrap("35", "39");
export const cyan = wrap("36", "39");
export const white = wrap("37", "39");
export const gray = wrap("90", "39");

export function strip(text: string): string {
  // biome-ignore lint/suspicious/noControlCharactersInRegex: stripping ANSI escape sequences requires matching the ESC control character
  return text.replace(/\x1b\[\d+m/g, "");
}

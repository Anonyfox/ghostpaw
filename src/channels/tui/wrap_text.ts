// biome-ignore lint/suspicious/noControlCharactersInRegex: matching ANSI escape sequences requires ESC (0x1b)
const ANSI_RE = /\x1b\[[0-9;]*m/g;

export function stripAnsi(s: string): string {
  return s.replace(ANSI_RE, "");
}

export function visibleLength(s: string): number {
  return stripAnsi(s).length;
}

export function wrapText(text: string, width: number): string[] {
  if (width < 1) return [text];
  const hardLines = text.split("\n");
  const result: string[] = [];

  for (const line of hardLines) {
    if (visibleLength(line) <= width) {
      result.push(line);
      continue;
    }
    wrapLine(line, width, result);
  }
  return result;
}

function wrapLine(line: string, width: number, out: string[]): void {
  const segments = splitSegments(line);
  let current = "";
  let currentVisible = 0;

  for (const seg of segments) {
    if (seg.startsWith("\x1b[")) {
      current += seg;
      continue;
    }
    const words = seg.split(/( +)/);
    for (const word of words) {
      if (word.length === 0) continue;
      if (currentVisible + word.length <= width) {
        current += word;
        currentVisible += word.length;
      } else if (currentVisible === 0) {
        for (let i = 0; i < word.length; i += width) {
          const slice = word.slice(i, i + width);
          if (i + width < word.length) {
            out.push(slice);
          } else {
            current = slice;
            currentVisible = slice.length;
          }
        }
      } else {
        out.push(current.trimEnd());
        current = word.trimStart();
        currentVisible = current.length;
      }
    }
  }
  if (current.length > 0 || out.length === 0) {
    out.push(current);
  }
}

function splitSegments(line: string): string[] {
  const parts: string[] = [];
  let last = 0;
  ANSI_RE.lastIndex = 0;
  for (;;) {
    const m = ANSI_RE.exec(line);
    if (m === null) break;
    if (m.index > last) parts.push(line.slice(last, m.index));
    parts.push(m[0]);
    last = m.index + m[0].length;
  }
  if (last < line.length) parts.push(line.slice(last));
  return parts;
}

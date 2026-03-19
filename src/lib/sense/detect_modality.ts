import type { Modality } from "./sense_types.ts";

const COMMENT_LINE_RE = /^\s*(?:\/\/|#|--|\/?\*)\s*/;
const DIALOGUE_LINE_RE = /^[A-Z][a-z]+\s*:/;
const CODE_SYNTAX_RE =
  /[{}();]|^\s*(function|const|let|var|import|export|return|if|for|while|class)\b/;

export function detectModality(text: string, compression: number): Modality {
  const lines = text.split("\n").filter((l) => l.trim().length > 0);

  if (compression < 0.35) return "code";
  if (lines.length >= 3) {
    const syntaxCount = lines.filter((l) => CODE_SYNTAX_RE.test(l)).length;
    if (syntaxCount / lines.length > 0.5) return "code";
  }

  if (lines.length >= 4) {
    const dialogueCount = lines.filter((l) => DIALOGUE_LINE_RE.test(l)).length;
    if (dialogueCount / lines.length > 0.3) return "dialogue";
  }

  return "prose";
}

export function extractCommentText(text: string): string {
  return text
    .split("\n")
    .filter((l) => COMMENT_LINE_RE.test(l))
    .map((l) => l.replace(COMMENT_LINE_RE, "").trim())
    .filter((l) => l.length > 0)
    .join(". ");
}

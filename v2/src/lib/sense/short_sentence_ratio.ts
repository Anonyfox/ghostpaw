import { tokenize } from "./tokenize.ts";

export function shortSentenceRatio(sentences: string[], threshold = 5): number {
  if (sentences.length === 0) return 0;
  return sentences.filter((s) => tokenize(s).length <= threshold).length / sentences.length;
}

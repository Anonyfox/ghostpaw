import { tokenize } from "./tokenize.ts";

export function sentenceLengthStats(sentences: string[]): { mean: number; stdDev: number } {
  if (sentences.length === 0) return { mean: 0, stdDev: 0 };
  const lengths = sentences.map((s) => tokenize(s).length);
  const mean = lengths.reduce((a, b) => a + b, 0) / lengths.length;
  const variance = lengths.reduce((a, l) => a + (l - mean) ** 2, 0) / lengths.length;
  return { mean, stdDev: Math.sqrt(variance) };
}

const NEGATION_WORDS = new Set([
  "not",
  "no",
  "never",
  "isn't",
  "can't",
  "doesn't",
  "don't",
  "won't",
  "couldn't",
  "wouldn't",
  "shouldn't",
  "hasn't",
  "haven't",
  "hadn't",
  "without",
  "neither",
  "nor",
  "nothing",
  "nobody",
  "nowhere",
  "none",
]);

export function negationDensity(words: string[]): number {
  if (words.length === 0) return 0;
  return words.filter((w) => NEGATION_WORDS.has(w)).length / words.length;
}

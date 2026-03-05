const SELF_WORDS = new Set(["i", "me", "my", "myself", "i'm", "i've", "i'd", "i'll", "mine"]);

export function selfReferenceRate(words: string[]): number {
  if (words.length === 0) return 0;
  return words.filter((w) => SELF_WORDS.has(w)).length / words.length;
}

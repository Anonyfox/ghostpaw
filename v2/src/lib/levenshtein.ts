export function levenshtein(a: string, b: string): number {
  if (a === b) return 0;
  if (a.length === 0) return b.length;
  if (b.length === 0) return a.length;

  if (a.length > b.length) {
    [a, b] = [b, a];
  }

  const aLen = a.length;
  const bLen = b.length;
  const row = new Array<number>(aLen + 1);

  for (let i = 0; i <= aLen; i++) {
    row[i] = i;
  }

  for (let j = 1; j <= bLen; j++) {
    let prev = row[0]!;
    row[0] = j;
    for (let i = 1; i <= aLen; i++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      const val = Math.min(row[i]! + 1, row[i - 1]! + 1, prev + cost);
      prev = row[i]!;
      row[i] = val;
    }
  }

  return row[aLen]!;
}

export function closestMatches(input: string, candidates: string[], maxResults = 3): string[] {
  if (candidates.length === 0) return [];

  const scored = candidates.map((c) => ({ candidate: c, distance: levenshtein(input, c) }));
  scored.sort((a, b) => a.distance - b.distance || a.candidate.localeCompare(b.candidate));

  return scored.slice(0, maxResults).map((s) => s.candidate);
}

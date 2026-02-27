const DEFAULT_DIMS = 256;

/**
 * Deterministic trigram-hash embedding. FNV-1a over overlapping character
 * trigrams, accumulated into a fixed-size vector, then L2-normalized.
 * No network, no model, no API key — pure local math.
 */
export function embedText(text: string, dims: number = DEFAULT_DIMS): number[] {
  if (dims <= 0) {
    throw new RangeError(`Embedding dimensions must be positive, got ${dims}`);
  }
  const vec = new Float64Array(dims);
  const normalized = text.toLowerCase().replace(/\s+/g, " ").trim();
  if (normalized.length === 0) return Array.from(vec);

  for (let i = 0; i <= normalized.length - 3; i++) {
    const trigram = normalized.slice(i, i + 3);
    let h = 2166136261;
    for (let j = 0; j < trigram.length; j++) {
      h ^= trigram.charCodeAt(j);
      h = Math.imul(h, 16777619);
    }
    vec[(h >>> 0) % dims] += (h & 1) === 0 ? 1 : -1;
  }

  let norm = 0;
  for (let i = 0; i < dims; i++) norm += vec[i] * vec[i];
  norm = Math.sqrt(norm);
  if (norm > 0) for (let i = 0; i < dims; i++) vec[i] /= norm;

  return Array.from(vec);
}

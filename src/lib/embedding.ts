/**
 * Vendor-agnostic text embedding via character n-gram hashing.
 * No API keys, no network, no LLM dependency — pure deterministic math.
 *
 * Projects text into a fixed-size vector by hashing overlapping trigrams
 * with FNV-1a, accumulating signed contributions, then L2-normalizing.
 * Sufficient for keyword-level recall across thousands of memories.
 */

const DEFAULT_DIMS = 256;

export interface EmbeddingProvider {
  embed(text: string): Promise<number[]>;
  embedMany(texts: string[]): Promise<number[][]>;
}

function hashEmbed(text: string, dims: number): number[] {
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
  for (let i = 0; i < dims; i++) norm += vec[i]! * vec[i]!;
  norm = Math.sqrt(norm);
  if (norm > 0) for (let i = 0; i < dims; i++) vec[i]! /= norm;

  return Array.from(vec);
}

export function createEmbeddingProvider(dims = DEFAULT_DIMS): EmbeddingProvider {
  return {
    async embed(text) {
      return hashEmbed(text, dims);
    },
    async embedMany(texts) {
      return texts.map((t) => hashEmbed(t, dims));
    },
  };
}

const EMBED_DIMS = 256;
const FNV_OFFSET = 2166136261;
const FNV_PRIME = 16777619;

export function embedText(text: string, dims = EMBED_DIMS): number[] {
  const vec = new Float64Array(dims);
  const normalized = text.toLowerCase().replace(/\s+/g, " ").trim();
  if (normalized.length < 3) return Array.from(vec);

  for (let i = 0; i <= normalized.length - 3; i++) {
    const trigram = normalized.slice(i, i + 3);
    let h = FNV_OFFSET;
    for (let j = 0; j < trigram.length; j++) {
      h ^= trigram.charCodeAt(j);
      h = Math.imul(h, FNV_PRIME);
    }
    vec[(h >>> 0) % dims] += (h & 1) === 0 ? 1 : -1;
  }

  let norm = 0;
  for (let i = 0; i < dims; i++) norm += vec[i] * vec[i];
  norm = Math.sqrt(norm);
  if (norm > 0) for (let i = 0; i < dims; i++) vec[i] /= norm;

  return Array.from(vec);
}

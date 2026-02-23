import { ValidationError } from "./errors.js";

export function cosineSimilarity(a: Float32Array, b: Float32Array): number {
  if (a.length !== b.length) {
    throw new ValidationError(
      "vectors",
      { aLen: a.length, bLen: b.length },
      "must have equal dimensions",
    );
  }

  let dot = 0;
  let normA = 0;
  let normB = 0;

  for (let i = 0; i < a.length; i++) {
    const ai = a[i]!;
    const bi = b[i]!;
    dot += ai * bi;
    normA += ai * ai;
    normB += bi * bi;
  }

  const denom = Math.sqrt(normA) * Math.sqrt(normB);
  return denom === 0 ? 0 : dot / denom;
}

export function vectorToBuffer(vec: number[]): Buffer {
  return Buffer.from(new Float32Array(vec).buffer);
}

export function bufferToVector(buf: Buffer): Float32Array {
  return new Float32Array(buf.buffer, buf.byteOffset, buf.byteLength / 4);
}

export interface ScoredCandidate {
  id: string;
  score: number;
}

export function topK(
  query: Float32Array,
  candidates: { id: string; embedding: Float32Array }[],
  k: number,
  minScore = -Infinity,
): ScoredCandidate[] {
  const scored: ScoredCandidate[] = [];

  for (const c of candidates) {
    const score = cosineSimilarity(query, c.embedding);
    if (score >= minScore) {
      scored.push({ id: c.id, score });
    }
  }

  scored.sort((a, b) => b.score - a.score);
  return scored.slice(0, k);
}

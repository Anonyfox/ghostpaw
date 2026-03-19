import { cosineSimilarity } from "./cosine_similarity.ts";
import { embedText } from "./embed_text.ts";

export function semanticDistanceCurve(sentences: string[]): number[] {
  if (sentences.length < 2) return [];
  const embeddings = sentences.map((s) => embedText(s));
  const distances: number[] = [];
  for (let i = 1; i < embeddings.length; i++) {
    distances.push(1 - cosineSimilarity(embeddings[i - 1], embeddings[i]));
  }
  return distances;
}

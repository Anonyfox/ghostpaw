export function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length !== b.length) throw new RangeError("vectors must have equal length");
  let dot = 0;
  for (let i = 0; i < a.length; i++) dot += a[i] * b[i];
  return dot;
}

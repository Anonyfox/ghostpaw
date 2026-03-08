export function trustLabel(trust: number): string {
  if (trust >= 0.8) return "deep";
  if (trust >= 0.6) return "solid";
  if (trust >= 0.3) return "growing";
  return "shallow";
}

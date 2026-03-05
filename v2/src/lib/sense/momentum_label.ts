export function momentumLabel(
  momentum: number | undefined,
): "sustained" | "oscillating" | "low" | "moderate" | undefined {
  if (momentum === undefined) return undefined;
  if (momentum > 0.3) return "sustained";
  if (momentum < -0.15) return "oscillating";
  if (Math.abs(momentum) < 0.1) return "low";
  return "moderate";
}

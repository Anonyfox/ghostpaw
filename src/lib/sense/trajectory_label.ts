export function trajectoryLabel(speed: number): string {
  if (speed < 0.05) return "STATIONARY";
  if (speed < 0.15) return "DRIFTING";
  if (speed < 0.35) return "MOVING";
  return "RAPID";
}

import { VELOCITY_KEYS, type VelocityVector } from "./compute_velocity.ts";

export function velocitySpeed(vel: VelocityVector): number {
  let sum = 0;
  for (const key of VELOCITY_KEYS) {
    sum += (vel.normalized[key] ?? 0) ** 2;
  }
  return Math.sqrt(sum);
}

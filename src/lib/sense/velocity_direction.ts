import { VELOCITY_KEYS, type VelocityVector } from "./compute_velocity.ts";

export function velocityDirection(vel: VelocityVector): { dominant: string; sign: number } {
  let maxAbs = 0;
  let dominant: string = VELOCITY_KEYS[0];
  let dominantSign = 0;

  for (const key of VELOCITY_KEYS) {
    const nv = vel.normalized[key] ?? 0;
    if (Math.abs(nv) > maxAbs) {
      maxAbs = Math.abs(nv);
      dominant = key;
      dominantSign = Math.sign(nv);
    }
  }

  return { dominant, sign: dominantSign };
}

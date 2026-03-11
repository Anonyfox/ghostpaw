import { packDigest } from "../core/pack/index.ts";
import type { DatabaseHandle } from "../lib/index.ts";

export function formatPackPatrol(db: DatabaseHandle, now: number = Date.now()): string {
  const digest = packDigest(db, 14, now);
  if (digest.patrol.length === 0) {
    return "";
  }

  const lines = digest.patrol.map((item) => `- ${item.name}: ${item.summary}`);
  return [
    "Current pack patrol items (strong signals only; act only when the conversation supports it):",
    ...lines,
  ].join("\n");
}

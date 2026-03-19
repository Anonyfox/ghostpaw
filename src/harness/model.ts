import { getConfig } from "../core/config/api/read/index.ts";
import type { DatabaseHandle } from "../lib/index.ts";

const FALLBACK_MODEL = "claude-sonnet-4-6";

export function resolveModel(db: DatabaseHandle, override?: string): string {
  if (override?.trim()) return override.trim();
  const configured = getConfig(db, "default_model");
  return typeof configured === "string" && configured ? configured : FALLBACK_MODEL;
}

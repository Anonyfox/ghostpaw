import { getConfig } from "../../core/config/index.ts";
import type { DatabaseHandle } from "../../lib/index.ts";

export function resolveModel(db: DatabaseHandle, override?: string): string {
  if (override) return override;
  const configured = getConfig(db, "default_model");
  return typeof configured === "string" && configured ? configured : "claude-sonnet-4-6";
}

import type { DatabaseHandle } from "../../lib/index.ts";
import { getConfig } from "../config/get_config.ts";
import { KNOWN_CONFIG_KEYS } from "../config/known_keys.ts";

export function resolveMemoryConfig(
  db: DatabaseHandle,
  key: string,
  explicitValue: number | undefined,
): number {
  if (explicitValue !== undefined) return explicitValue;
  try {
    return getConfig(db, key) as number;
  } catch {
    // Config table may not exist yet (e.g. isolated tests). Fall back to
    // the code default from KNOWN_CONFIG_KEYS — safe because all memory
    // knobs are registered with numeric defaults.
    const known = KNOWN_CONFIG_KEYS.find((k) => k.key === key);
    return (known?.defaultValue as number) ?? 0;
  }
}

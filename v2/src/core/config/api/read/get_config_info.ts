import type { DatabaseHandle } from "../../../../lib/index.ts";
import { getConfig } from "../../get_config.ts";
import { getCurrentEntry } from "../../get_current_entry.ts";
import { KNOWN_CONFIG_KEYS } from "../../known_keys.ts";
import type { ConfigInfo } from "../types.ts";

export function getConfigInfo(db: DatabaseHandle, key: string): ConfigInfo | null {
  const known = KNOWN_CONFIG_KEYS.find((entry) => entry.key === key);
  const current = getCurrentEntry(db, key);

  if (!known && !current) {
    return null;
  }

  const value = getConfig(db, key);
  if (value === null) {
    return null;
  }

  return {
    key,
    value,
    type: known?.type ?? current!.type,
    category: known?.category ?? current!.category,
    source: current?.source ?? "default",
    isDefault: current === null,
    label: known?.label,
    description: known?.description,
    updatedAt: current?.updatedAt ?? null,
  };
}

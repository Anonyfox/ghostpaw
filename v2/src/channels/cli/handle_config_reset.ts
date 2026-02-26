import type { ConfigValue } from "../../core/config/index.ts";
import { deleteConfig, getCurrentEntry, KNOWN_CONFIG_KEYS } from "../../core/config/index.ts";
import type { DatabaseHandle } from "../../lib/database.ts";

export interface ConfigResetResult {
  key: string;
  wasOverridden: boolean;
  isKnown: boolean;
  defaultValue?: ConfigValue;
}

export function handleConfigReset(db: DatabaseHandle, key: string): ConfigResetResult {
  const known = KNOWN_CONFIG_KEYS.find((k) => k.key === key);
  const entry = getCurrentEntry(db, key);

  if (entry) {
    deleteConfig(db, key);
  }

  return {
    key,
    wasOverridden: entry !== null,
    isKnown: known !== undefined,
    defaultValue: known?.defaultValue,
  };
}

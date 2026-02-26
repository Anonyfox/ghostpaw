import type {
  ConfigCategory,
  ConfigSource,
  ConfigType,
  ConfigValue,
} from "../../core/config/index.ts";
import { getConfig, getCurrentEntry, KNOWN_CONFIG_KEYS } from "../../core/config/index.ts";
import type { DatabaseHandle } from "../../lib/database.ts";

export interface ConfigGetResult {
  found: boolean;
  key: string;
  value?: ConfigValue;
  type?: ConfigType;
  category?: ConfigCategory;
  source?: ConfigSource;
  isDefault: boolean;
  label?: string;
}

export function handleConfigGet(db: DatabaseHandle, key: string): ConfigGetResult {
  const known = KNOWN_CONFIG_KEYS.find((k) => k.key === key);
  const entry = getCurrentEntry(db, key);
  const value = getConfig(db, key);

  if (entry) {
    return {
      found: true,
      key,
      value: value ?? undefined,
      type: known ? known.type : entry.type,
      category: entry.category,
      source: entry.source,
      isDefault: false,
      label: known?.label,
    };
  }

  if (known) {
    return {
      found: true,
      key,
      value: known.defaultValue,
      type: known.type,
      category: known.category,
      isDefault: true,
      label: known.label,
    };
  }

  return { found: false, key, isDefault: false };
}

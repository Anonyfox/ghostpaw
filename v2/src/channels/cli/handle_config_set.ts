import type { ConfigType, ConfigValue } from "../../core/config/index.ts";
import {
  getCurrentEntry,
  KNOWN_CONFIG_KEYS,
  parseConfigValue,
  setConfig,
} from "../../core/config/index.ts";
import type { DatabaseHandle } from "../../lib/database.ts";
import { inferTypeFromString } from "./infer_type_from_string.ts";

export interface ConfigSetResult {
  success: boolean;
  key: string;
  type: ConfigType;
  previousValue?: string;
  newValue: string;
  error?: string;
}

export function handleConfigSet(
  db: DatabaseHandle,
  key: string,
  rawValue: string,
  typeOverride?: ConfigType,
): ConfigSetResult {
  const known = KNOWN_CONFIG_KEYS.find((k) => k.key === key);
  const type: ConfigType = known ? known.type : (typeOverride ?? inferTypeFromString(rawValue));

  let parsed: ConfigValue;
  try {
    parsed = parseConfigValue(rawValue, type);
  } catch (err) {
    const detail = err instanceof Error ? err.message : String(err);
    return {
      success: false,
      key,
      type,
      newValue: rawValue,
      error: `${key} expects ${type}, got "${rawValue}": ${detail}`,
    };
  }

  const previous = getCurrentEntry(db, key);
  const previousValue = previous?.value;

  try {
    setConfig(db, key, parsed, "cli", known ? undefined : type);
  } catch (err) {
    return {
      success: false,
      key,
      type,
      newValue: rawValue,
      error: err instanceof Error ? err.message : String(err),
    };
  }

  return { success: true, key, type, previousValue, newValue: rawValue };
}

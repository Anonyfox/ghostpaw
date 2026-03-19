import type { ConfigType, ConfigValue } from "../../core/config/api/types.ts";
import { setConfigValue } from "../../harness/public/settings/config.ts";
import type { DatabaseHandle } from "../../lib/index.ts";
import { inferTypeFromString } from "./infer_type_from_string.ts";

export interface ConfigSetResult {
  success: boolean;
  key: string;
  type: ConfigType;
  previousValue?: ConfigValue;
  newValue: ConfigValue;
  error?: string;
}

export function handleConfigSet(
  db: DatabaseHandle,
  key: string,
  rawValue: string,
  typeOverride?: ConfigType,
): ConfigSetResult {
  return setConfigValue(db, key, rawValue, "cli", typeOverride ?? inferTypeFromString(rawValue));
}

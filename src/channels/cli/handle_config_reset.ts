import type { ConfigValue } from "../../core/config/api/types.ts";
import { resetConfigValue } from "../../harness/public/settings/config.ts";
import type { DatabaseHandle } from "../../lib/index.ts";

export interface ConfigResetResult {
  key: string;
  wasOverridden: boolean;
  isKnown: boolean;
  defaultValue?: ConfigValue;
}

export function handleConfigReset(db: DatabaseHandle, key: string): ConfigResetResult {
  return resetConfigValue(db, key);
}

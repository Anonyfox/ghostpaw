import type { ConfigValue } from "../../core/config/api/types.ts";
import { undoConfigValue } from "../../harness/public/settings/config.ts";
import type { DatabaseHandle } from "../../lib/index.ts";

export interface ConfigUndoResult {
  success: boolean;
  key: string;
  previousValue?: ConfigValue;
  restoredValue?: ConfigValue;
  isKnown: boolean;
  restoredToDefault: boolean;
}

export function handleConfigUndo(db: DatabaseHandle, key: string): ConfigUndoResult {
  return undoConfigValue(db, key);
}

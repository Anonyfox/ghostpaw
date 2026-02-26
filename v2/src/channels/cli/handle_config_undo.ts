import type { ConfigValue } from "../../core/config/index.ts";
import {
  getConfig,
  getCurrentEntry,
  KNOWN_CONFIG_KEYS,
  undoConfig,
} from "../../core/config/index.ts";
import type { DatabaseHandle } from "../../lib/database.ts";

export interface ConfigUndoResult {
  success: boolean;
  key: string;
  previousValue?: ConfigValue;
  restoredValue?: ConfigValue;
  isKnown: boolean;
  restoredToDefault: boolean;
}

export function handleConfigUndo(db: DatabaseHandle, key: string): ConfigUndoResult {
  const known = KNOWN_CONFIG_KEYS.find((k) => k.key === key);
  const isKnown = known !== undefined;
  const before = getCurrentEntry(db, key);

  if (!before) {
    return { success: false, key, isKnown, restoredToDefault: false };
  }

  const previousValue = getConfig(db, key);
  const undone = undoConfig(db, key);

  if (!undone) {
    return { success: false, key, isKnown, restoredToDefault: false };
  }

  const after = getCurrentEntry(db, key);
  const restoredToDefault = after === null;
  const restoredValue = restoredToDefault && known ? known.defaultValue : getConfig(db, key);

  return {
    success: true,
    key,
    previousValue: previousValue ?? undefined,
    restoredValue: restoredValue ?? undefined,
    isKnown,
    restoredToDefault,
  };
}

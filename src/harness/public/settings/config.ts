import { getConfigInfo } from "../../../core/config/api/read/index.ts";
import type { ConfigType, ConfigValue } from "../../../core/config/api/types.ts";
import { resetConfig, setConfig, undoConfig } from "../../../core/config/api/write/index.ts";
import type { DatabaseHandle } from "../../../lib/index.ts";

export interface ConfigSetResult {
  success: boolean;
  key: string;
  type: ConfigType;
  previousValue?: ConfigValue;
  newValue: ConfigValue;
  error?: string;
}

export interface ConfigUndoResult {
  success: boolean;
  key: string;
  previousValue?: ConfigValue;
  restoredValue?: ConfigValue;
  isKnown: boolean;
  restoredToDefault: boolean;
}

export interface ConfigResetResult {
  key: string;
  wasOverridden: boolean;
  isKnown: boolean;
  defaultValue?: ConfigValue;
}

export function setConfigValue(
  db: DatabaseHandle,
  key: string,
  rawValue: string,
  source: "cli" | "web",
  typeOverride?: ConfigType,
): ConfigSetResult {
  const previous = getConfigInfo(db, key);
  const type = previous?.type ?? typeOverride ?? inferTypeFromString(rawValue);

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

  try {
    setConfig(db, key, parsed, source, previous?.isDefault ? undefined : type);
  } catch (err) {
    return {
      success: false,
      key,
      type,
      newValue: parsed,
      error: err instanceof Error ? err.message : String(err),
    };
  }

  return {
    success: true,
    key,
    type,
    previousValue: previous && !previous.isDefault ? previous.value : undefined,
    newValue: parsed,
  };
}

export function undoConfigValue(db: DatabaseHandle, key: string): ConfigUndoResult {
  const before = getConfigInfo(db, key);
  const isKnown = before?.isDefault === true || before?.label !== undefined;
  if (!before || before.isDefault) {
    return { success: false, key, isKnown, restoredToDefault: false };
  }

  const previousValue = before.value;
  const undone = undoConfig(db, key);
  if (!undone) {
    return { success: false, key, isKnown, restoredToDefault: false };
  }

  const after = getConfigInfo(db, key);
  const restoredToDefault = after === null || after.isDefault;
  return {
    success: true,
    key,
    previousValue,
    restoredValue: after?.value,
    isKnown: isKnown || after?.label !== undefined,
    restoredToDefault,
  };
}

export function resetConfigValue(db: DatabaseHandle, key: string): ConfigResetResult {
  const before = getConfigInfo(db, key);
  const wasOverridden = before !== null && !before.isDefault;
  const isKnown = before?.label !== undefined || before?.isDefault === true;

  if (wasOverridden) {
    resetConfig(db, key);
  }

  return {
    key,
    wasOverridden,
    isKnown,
    defaultValue: getConfigInfo(db, key)?.value,
  };
}

function inferTypeFromString(raw: string): ConfigType {
  if (raw === "true" || raw === "false") return "boolean";
  if (/^-?(0|[1-9]\d*)$/.test(raw)) return "integer";
  if (/^-?(0|[1-9]\d*)\.\d+$/.test(raw)) return "number";
  return "string";
}

function parseConfigValue(text: string, type: ConfigType): ConfigValue {
  switch (type) {
    case "string":
      return text;
    case "integer":
      if (!/^-?\d+$/.test(text)) throw new Error(`"${text}" is not a valid integer.`);
      return Number.parseInt(text, 10);
    case "number": {
      const value = Number(text);
      if (text.trim() === "" || !Number.isFinite(value)) {
        throw new Error(`"${text}" is not a valid number.`);
      }
      return value;
    }
    case "boolean":
      if (text === "true") return true;
      if (text === "false") return false;
      throw new Error(`"${text}" is not a valid boolean. Use "true" or "false".`);
  }
}

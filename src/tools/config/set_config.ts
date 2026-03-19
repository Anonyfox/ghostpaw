import { createTool, Schema } from "chatoyant";
import { getConfigInfo } from "../../core/config/api/read/index.ts";
import type { ConfigType, ConfigValue } from "../../core/config/api/types.ts";
import { setConfig } from "../../core/config/api/write/index.ts";
import type { DatabaseHandle } from "../../lib/index.ts";

class SetConfigParams extends Schema {
  key = Schema.String({
    description:
      "Configuration key name (e.g. 'default_model', 'temperature'). " +
      "Use list_config to discover available keys.",
  });
  value = Schema.String({
    description:
      "Value as a string. Type is inferred: '0.7' → number, 'true'/'false' → boolean, " +
      "'42' → integer, anything else → string. Known system keys always use their defined type. " +
      "Examples: '0.7' for temperature, 'claude-sonnet-4-20250514' for default_model, " +
      "'5.00' for max_cost_per_day.",
  });
}

export function createSetConfigTool(db: DatabaseHandle) {
  return createTool({
    name: "set_config",
    description:
      "Set a configuration value. The type is inferred automatically for known keys " +
      "and from the value format for custom keys. " +
      "Changes are global and permanent — all sessions inherit the new value. " +
      "Source is recorded as 'agent'. Use get_config to check current values first.",
    // biome-ignore lint/suspicious/noExplicitAny: chatoyant SchemaInstance index-signature limitation
    parameters: new SetConfigParams() as any,
    execute: async ({ args }) => {
      const { key, value } = args as { key: string; value: string };

      if (!key || !key.trim()) return { error: "Key name is required." };
      if (value === undefined || value === null || value === "") {
        return { error: "Value is required." };
      }

      return applyConfigChange(db, key, value);
    },
  });
}

function applyConfigChange(db: DatabaseHandle, key: string, rawValue: string) {
  const current = getConfigInfo(db, key);
  const type: ConfigType = current?.type ?? inferTypeFromString(rawValue);

  let parsed: ConfigValue;
  try {
    parsed = parseConfigValue(rawValue, type);
  } catch (err) {
    const detail = err instanceof Error ? err.message : String(err);
    return { error: `Invalid value for ${type}: "${rawValue}". ${detail}` };
  }

  try {
    setConfig(db, key, parsed, "agent", current?.isDefault ? undefined : type);
  } catch (err) {
    const detail = err instanceof Error ? err.message : String(err);
    return { error: `Failed to set "${key}": ${detail}` };
  }

  return {
    key,
    value: parsed,
    type,
    previous_value: current && !current.isDefault ? formatRawValue(current.value) : undefined,
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

function formatRawValue(value: ConfigValue): string {
  return typeof value === "string" ? value : String(value);
}

import { createTool, Schema } from "chatoyant";
import type { ConfigType, ConfigValue } from "../../core/config/index.ts";
import {
  getCurrentEntry,
  inferTypeFromString,
  KNOWN_CONFIG_KEYS,
  parseConfigValue,
  setConfig,
} from "../../core/config/index.ts";
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
  const known = KNOWN_CONFIG_KEYS.find((k) => k.key === key);
  const type: ConfigType = known ? known.type : inferTypeFromString(rawValue);

  let parsed: ConfigValue;
  try {
    parsed = parseConfigValue(rawValue, type);
  } catch (err) {
    const detail = err instanceof Error ? err.message : String(err);
    return { error: `Invalid value for ${type}: "${rawValue}". ${detail}` };
  }

  const previous = getCurrentEntry(db, key);

  try {
    setConfig(db, key, parsed, "agent", known ? undefined : type);
  } catch (err) {
    const detail = err instanceof Error ? err.message : String(err);
    return { error: `Failed to set "${key}": ${detail}` };
  }

  return {
    key,
    value: parsed,
    type,
    previous_value: previous?.value,
  };
}

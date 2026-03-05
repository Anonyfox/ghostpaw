import { createTool, Schema } from "chatoyant";
import { getConfig, getCurrentEntry, KNOWN_CONFIG_KEYS } from "../../core/config/index.ts";
import type { DatabaseHandle } from "../../lib/index.ts";

class GetConfigParams extends Schema {
  key = Schema.String({
    description:
      "Configuration key name (e.g. 'default_model', 'temperature', 'max_cost_per_day'). " +
      "Use list_config to discover available key names.",
  });
}

export function createGetConfigTool(db: DatabaseHandle) {
  return createTool({
    name: "get_config",
    description:
      "Read a single configuration value by key. Returns the current value, whether it's " +
      "the built-in default or was overridden, its type, category, and source (who set it). " +
      "Use list_config first to discover available key names.",
    // biome-ignore lint/suspicious/noExplicitAny: chatoyant SchemaInstance index-signature limitation
    parameters: new GetConfigParams() as any,
    execute: async ({ args }) => {
      const { key } = args as { key: string };
      if (!key || !key.trim()) return { error: "Key name is required." };

      const known = KNOWN_CONFIG_KEYS.find((k) => k.key === key);
      const entry = getCurrentEntry(db, key);

      if (entry) {
        return {
          key,
          value: getConfig(db, key),
          type: known ? known.type : entry.type,
          category: entry.category,
          source: entry.source,
          label: known?.label,
          description: known?.description,
        };
      }

      if (known) {
        return {
          key,
          value: known.defaultValue,
          type: known.type,
          category: known.category,
          source: "default",
          label: known.label,
          description: known.description,
        };
      }

      return { error: `Unknown config key "${key}". Use list_config to see available keys.` };
    },
  });
}

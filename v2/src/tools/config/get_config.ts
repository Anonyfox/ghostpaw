import { createTool, Schema } from "chatoyant";
import { getConfigInfo } from "../../core/config/api/read/index.ts";
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

      const info = getConfigInfo(db, key);
      if (!info)
        return { error: `Unknown config key "${key}". Use list_config to see available keys.` };
      return info;
    },
  });
}

import { createTool, Schema } from "chatoyant";
import type { ConfigType } from "../../core/config/index.ts";
import { listConfig, parseConfigValue } from "../../core/config/index.ts";
import type { DatabaseHandle } from "../../lib/database.ts";

class ListConfigParams extends Schema {
  category = Schema.String({
    description: "Filter by category: model, cost, behavior, or custom. Omit for all.",
  });
}

export function createListConfigTool(db: DatabaseHandle) {
  return createTool({
    name: "list_config",
    description:
      "List all configuration entries with their current values, types, categories, and sources. " +
      "Shows both system keys (with defaults) and custom keys. " +
      "Optionally filter by category (model, cost, behavior, custom).",
    // biome-ignore lint/suspicious/noExplicitAny: chatoyant SchemaInstance index-signature limitation
    parameters: new ListConfigParams() as any,
    execute: async ({ args }) => {
      const { category } = args as { category?: string };
      const all = listConfig(db);

      const filtered = category ? all.filter((e) => e.category === category) : all;

      const entries = filtered.map((e) => ({
        key: e.key,
        value: safeParseValue(e.value, e.type),
        type: e.type,
        category: e.category,
        source: e.source,
      }));

      return { entries };
    },
  });
}

function safeParseValue(raw: string, type: ConfigType): string | number | boolean {
  try {
    return parseConfigValue(raw, type);
  } catch {
    // Corrupted or mismatched DB value — show raw string rather than crash the listing
    return raw;
  }
}

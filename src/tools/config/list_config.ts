import { createTool, Schema } from "chatoyant";
import { listConfigInfo } from "../../core/config/api/read/index.ts";
import type { DatabaseHandle } from "../../lib/index.ts";

class ListConfigParams extends Schema {
  category = Schema.String({
    optional: true,
    description: "Filter by category: model, cost, behavior, or custom. Omit for all.",
  });
}

export function createListConfigTool(db: DatabaseHandle) {
  return createTool({
    name: "list_config",
    description:
      "List all configuration entries with current values, types, categories, and sources. " +
      "Shows both system keys (with defaults) and custom keys. Use this to discover " +
      "available settings before calling get_config or set_config. " +
      "Optionally filter by category: 'model', 'cost', 'behavior', or 'custom'.",
    // biome-ignore lint/suspicious/noExplicitAny: chatoyant SchemaInstance index-signature limitation
    parameters: new ListConfigParams() as any,
    execute: async ({ args }) => {
      const { category } = args as { category?: string };
      const all = listConfigInfo(db);

      const filtered = category ? all.filter((e) => e.category === category) : all;
      return { entries: filtered };
    },
  });
}

import { defineCommand } from "citty";
import type { ConfigCategory } from "../../core/config/api/types.ts";
import { CONFIG_CATEGORIES } from "../../core/config/api/types.ts";
import { formatConfigList } from "./format_config_list.ts";
import { withConfigDb } from "./with_config_db.ts";

export default defineCommand({
  meta: { name: "list", description: "List all configuration" },
  args: {
    category: {
      type: "string",
      description: "Filter by category: model, cost, behavior, custom",
      required: false,
    },
  },
  async run({ args }) {
    const cat = args.category as string | undefined;
    if (cat && !CONFIG_CATEGORIES.includes(cat as ConfigCategory)) {
      throw new Error(
        `Invalid --category "${cat}". Must be one of: ${CONFIG_CATEGORIES.join(", ")}`,
      );
    }

    await withConfigDb((db) => {
      for (const line of formatConfigList(db, cat as ConfigCategory | undefined)) {
        console.log(line);
      }
    });
  },
});

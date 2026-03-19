import { defineCommand } from "citty";
import type { ConfigType } from "../../core/config/api/types.ts";
import { CONFIG_TYPES } from "../../core/config/api/types.ts";
import { log, style } from "../../lib/terminal/index.ts";
import { handleConfigSet } from "./handle_config_set.ts";
import { withConfigDb } from "./with_config_db.ts";

export default defineCommand({
  meta: { name: "set", description: "Set a configuration value" },
  args: {
    key: {
      type: "positional",
      description: "Configuration key (e.g. default_model)",
      required: true,
    },
    value: {
      type: "positional",
      description: "Value to set",
      required: true,
    },
    type: {
      type: "string",
      description: "Explicit type: string, integer, number, boolean",
      required: false,
    },
  },
  async run({ args }) {
    const typeOverride = args.type as string | undefined;
    if (typeOverride && !CONFIG_TYPES.includes(typeOverride as ConfigType)) {
      throw new Error(
        `Invalid --type "${typeOverride}". Must be one of: ${CONFIG_TYPES.join(", ")}`,
      );
    }

    await withConfigDb((db) => {
      const result = handleConfigSet(
        db,
        args.key,
        String(args.value),
        typeOverride as ConfigType | undefined,
      );
      if (!result.success) {
        throw new Error(result.error!);
      }
      if (result.previousValue !== undefined) {
        log.done(`${result.key}: ${result.previousValue} ${style.dim("->")} ${result.newValue}`);
      } else {
        log.done(`${result.key} = ${result.newValue} ${style.dim(`(${result.type})`)}`);
      }
    });
  },
});

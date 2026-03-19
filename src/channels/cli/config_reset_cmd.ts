import { defineCommand } from "citty";
import { log } from "../../lib/terminal/index.ts";
import { handleConfigReset } from "./handle_config_reset.ts";
import { withConfigDb } from "./with_config_db.ts";

export default defineCommand({
  meta: { name: "reset", description: "Reset a configuration key to its default" },
  args: {
    key: {
      type: "positional",
      description: "Configuration key",
      required: true,
    },
  },
  async run({ args }) {
    await withConfigDb((db) => {
      const result = handleConfigReset(db, args.key);
      if (result.isKnown) {
        if (result.wasOverridden) {
          log.done(`${result.key} reset to default (${result.defaultValue})`);
        } else {
          log.info(`${result.key} is already at default (${result.defaultValue})`);
        }
      } else {
        if (result.wasOverridden) {
          log.done(`${result.key} removed`);
        } else {
          log.info(`${result.key} is not configured`);
        }
      }
    });
  },
});

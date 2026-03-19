import { defineCommand } from "citty";
import { log } from "../../lib/terminal/index.ts";
import { handleConfigUndo } from "./handle_config_undo.ts";
import { withConfigDb } from "./with_config_db.ts";

export default defineCommand({
  meta: { name: "undo", description: "Undo the last change to a configuration key" },
  args: {
    key: {
      type: "positional",
      description: "Configuration key",
      required: true,
    },
  },
  async run({ args }) {
    await withConfigDb((db) => {
      const result = handleConfigUndo(db, args.key);
      if (!result.success) {
        log.info(`${result.key} has no change history to undo`);
        return;
      }
      if (result.restoredToDefault) {
        if (result.isKnown) {
          log.done(`${result.key} reset to default (was ${result.previousValue})`);
        } else {
          log.done(`${result.key} removed (was ${result.previousValue})`);
        }
      } else {
        log.done(`${result.key} restored to ${result.restoredValue} (was ${result.previousValue})`);
      }
    });
  },
});

import { defineCommand } from "citty";
import { log, style } from "../../lib/terminal/index.ts";
import { handleConfigGet } from "./handle_config_get.ts";
import { withConfigDb } from "./with_config_db.ts";

export default defineCommand({
  meta: { name: "get", description: "Get a configuration value" },
  args: {
    key: {
      type: "positional",
      description: "Configuration key",
      required: true,
    },
  },
  async run({ args }) {
    await withConfigDb((db) => {
      const result = handleConfigGet(db, args.key);
      if (!result.found) {
        throw new Error(`"${args.key}" is not configured`);
      }

      if (!process.stdout.isTTY) {
        process.stdout.write(String(result.value));
        return;
      }

      const display = typeof result.value === "string" ? `"${result.value}"` : String(result.value);
      const meta: string[] = [];
      if (result.type) meta.push(result.type);
      if (result.category) meta.push(result.category);
      if (result.isDefault) {
        meta.push("default");
      } else if (result.source) {
        meta.push(`set via ${result.source}`);
      }
      log.info(`${args.key} = ${display}  ${style.dim(`(${meta.join(", ")})`)}`);
    });
  },
});

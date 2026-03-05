import { defineCommand } from "citty";
import { createSoul } from "../../core/souls/index.ts";
import { style } from "../../lib/terminal/index.ts";
import { withRunDb } from "./with_run_db.ts";

export default defineCommand({
  meta: { name: "create", description: "Create a new soul" },
  args: {
    name: {
      type: "positional",
      description: "Name for the new soul",
      required: true,
    },
    essence: {
      type: "string",
      description: "Essence text (identity and behavior)",
      required: true,
    },
    description: {
      type: "string",
      description: "Short description of the soul",
    },
  },
  async run({ args }) {
    const name = (args._ ?? []).join(" ") || (args.name as string);
    if (!name?.trim()) {
      console.error(style.boldRed("error".padStart(10)), " Soul name is required.");
      process.exitCode = 1;
      return;
    }
    const essence = args.essence as string | undefined;
    if (!essence?.trim()) {
      console.error(style.boldRed("error".padStart(10)), " --essence is required.");
      process.exitCode = 1;
      return;
    }

    await withRunDb((db) => {
      try {
        const soul = createSoul(db, {
          name: name.trim(),
          essence: essence.trim(),
          description: (args.description as string | undefined)?.trim() ?? "",
        });
        console.log(
          style.cyan("created".padStart(10)),
          ` "${soul.name}" (id: ${soul.id}, level: ${soul.level})`,
        );
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        console.error(style.boldRed("error".padStart(10)), ` ${msg}`);
        process.exitCode = 1;
      }
    });
  },
});

import { defineCommand } from "citty";
import { resolveSoul, updateSoul } from "../../core/souls/index.ts";
import { style } from "../../lib/terminal/index.ts";
import { withRunDb } from "./with_run_db.ts";

export default defineCommand({
  meta: { name: "edit", description: "Edit a soul's name, essence, or description" },
  args: {
    soul: {
      type: "positional",
      description: "Soul ID or name to edit",
      required: true,
    },
    name: {
      type: "string",
      description: "New name for the soul",
    },
    essence: {
      type: "string",
      description: "New essence text",
    },
    description: {
      type: "string",
      description: "New description text",
    },
  },
  async run({ args }) {
    const soulArg = (args._ ?? []).join(" ") || (args.soul as string);
    if (!soulArg?.trim()) {
      console.error(style.boldRed("error".padStart(10)), " Soul ID or name is required.");
      process.exitCode = 1;
      return;
    }

    const newName = args.name as string | undefined;
    const newEssence = args.essence as string | undefined;
    const newDescription = args.description as string | undefined;

    if (!newName?.trim() && !newEssence?.trim() && !newDescription?.trim()) {
      console.error(
        style.boldRed("error".padStart(10)),
        " At least one of --name, --essence, or --description is required.",
      );
      process.exitCode = 1;
      return;
    }

    await withRunDb((db) => {
      const soul = resolveSoul(db, soulArg);
      if (!soul) {
        console.error(style.boldRed("error".padStart(10)), ` Soul "${soulArg}" not found.`);
        process.exitCode = 1;
        return;
      }

      try {
        const input: Record<string, string> = {};
        if (newName?.trim()) input.name = newName.trim();
        if (newEssence?.trim()) input.essence = newEssence.trim();
        if (newDescription?.trim()) input.description = newDescription.trim();

        const updated = updateSoul(db, soul.id, input);
        console.log(style.cyan("updated".padStart(10)), ` "${updated.name}"`);
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        console.error(style.boldRed("error".padStart(10)), ` ${msg}`);
        process.exitCode = 1;
      }
    });
  },
});

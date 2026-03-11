import { defineCommand } from "citty";
import { resolveSoul } from "../../core/souls/api/read/index.ts";
import { addSoulTrait } from "../../harness/public/souls.ts";
import { style } from "../../lib/terminal/index.ts";
import { withRunDb } from "./with_run_db.ts";

export default defineCommand({
  meta: { name: "add-trait", description: "Add a new trait to a soul" },
  args: {
    name: {
      type: "positional",
      description: "Soul ID or name",
      required: true,
    },
    principle: {
      type: "positional",
      description: "Trait principle text",
      required: true,
    },
    provenance: {
      type: "string",
      description: "Where this trait came from (default: 'added via CLI')",
    },
  },
  async run({ args }) {
    const positionals = args._ ?? [];
    const soulArg = (args.name as string) || positionals[0] || "";
    const principle = (args.principle as string) || positionals.slice(1).join(" ") || "";

    if (!soulArg?.trim()) {
      console.error(style.boldRed("error".padStart(10)), " Soul ID or name is required.");
      process.exitCode = 1;
      return;
    }
    if (!principle?.trim()) {
      console.error(style.boldRed("error".padStart(10)), " Trait principle text is required.");
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
        const provenance = (args.provenance as string | undefined)?.trim() || "added via CLI";
        const trait = addSoulTrait(db, soul.id, {
          principle: principle.trim(),
          provenance,
        });
        console.log(style.cyan("trait".padStart(10)), ` added #${trait.id} to "${soul.name}"`);
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        console.error(style.boldRed("error".padStart(10)), ` ${msg}`);
        process.exitCode = 1;
      }
    });
  },
});

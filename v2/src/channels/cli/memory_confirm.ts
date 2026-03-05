import { defineCommand } from "citty";
import { confirmMemory, getMemory } from "../../core/memory/index.ts";
import { style } from "../../lib/terminal/index.ts";
import { withRunDb } from "./with_run_db.ts";

export default defineCommand({
  meta: { name: "confirm", description: "Confirm a memory (bump confidence)" },
  args: {
    id: {
      type: "positional",
      description: "Memory ID to confirm",
      required: true,
    },
  },
  async run({ args }) {
    const raw = (args._ ?? [])[0] || (args.id as string);
    const id = Number(raw);
    if (!Number.isInteger(id) || id <= 0) {
      console.error(style.boldRed("error".padStart(10)), " Memory ID must be a positive integer.");
      process.exitCode = 1;
      return;
    }

    await withRunDb((db) => {
      const before = getMemory(db, id);
      if (!before) {
        console.error(style.boldRed("error".padStart(10)), ` Memory #${id} not found.`);
        process.exitCode = 1;
        return;
      }

      try {
        const after = confirmMemory(db, id);
        console.log(
          style.cyan("confirmed".padStart(10)),
          ` #${id} confidence ${before.confidence.toFixed(2)} -> ${after.confidence.toFixed(2)}`,
        );
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        console.error(style.boldRed("error".padStart(10)), ` ${msg}`);
        process.exitCode = 1;
      }
    });
  },
});

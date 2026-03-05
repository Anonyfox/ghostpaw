import { defineCommand } from "citty";
import { getMemory, supersedeMemories } from "../../core/memory/index.ts";
import { style } from "../../lib/terminal/index.ts";
import { withRunDb } from "./with_run_db.ts";

export default defineCommand({
  meta: { name: "forget", description: "Mark a memory as no longer valid" },
  args: {
    id: {
      type: "positional",
      description: "Memory ID to forget",
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
      const mem = getMemory(db, id);
      if (!mem) {
        console.error(style.boldRed("error".padStart(10)), ` Memory #${id} not found.`);
        process.exitCode = 1;
        return;
      }
      if (mem.supersededBy !== null) {
        console.error(style.boldRed("error".padStart(10)), ` Memory #${id} is already superseded.`);
        process.exitCode = 1;
        return;
      }

      try {
        supersedeMemories(db, [id]);
        console.log(style.cyan("forgotten".padStart(10)), ` #${id} "${mem.claim.slice(0, 60)}"`);
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        console.error(style.boldRed("error".padStart(10)), ` ${msg}`);
        process.exitCode = 1;
      }
    });
  },
});

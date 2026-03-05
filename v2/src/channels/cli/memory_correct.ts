import { defineCommand } from "citty";
import { embedText, getMemory, storeMemory, supersedeMemories } from "../../core/memory/index.ts";
import { style } from "../../lib/terminal/index.ts";
import { withRunDb } from "./with_run_db.ts";

export default defineCommand({
  meta: { name: "correct", description: "Replace a memory with a corrected version" },
  args: {
    id: {
      type: "positional",
      description: "Memory ID to correct",
      required: true,
    },
    claim: {
      type: "string",
      description: "New corrected claim text",
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

    const claim = args.claim as string;
    if (!claim?.trim()) {
      console.error(style.boldRed("error".padStart(10)), " --claim is required.");
      process.exitCode = 1;
      return;
    }

    await withRunDb((db) => {
      const old = getMemory(db, id);
      if (!old) {
        console.error(style.boldRed("error".padStart(10)), ` Memory #${id} not found.`);
        process.exitCode = 1;
        return;
      }
      if (old.supersededBy !== null) {
        console.error(style.boldRed("error".padStart(10)), ` Memory #${id} is already superseded.`);
        process.exitCode = 1;
        return;
      }

      try {
        const embedding = embedText(claim.trim());
        const created = storeMemory(db, claim.trim(), embedding, { source: "explicit" });
        supersedeMemories(db, [id], created.id);
        console.log(
          style.cyan("corrected".padStart(10)),
          ` #${id} -> #${created.id} "${claim.trim().slice(0, 50)}"`,
        );
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        console.error(style.boldRed("error".padStart(10)), ` ${msg}`);
        process.exitCode = 1;
      }
    });
  },
});

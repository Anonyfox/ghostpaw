import { defineCommand } from "citty";
import { embedText, getMemory, storeMemory, supersedeMemories } from "../../core/memory/index.ts";
import { style } from "../../lib/terminal/index.ts";
import { withRunDb } from "./with_run_db.ts";

export default defineCommand({
  meta: { name: "merge", description: "Merge multiple memories into one" },
  args: {
    ids: {
      type: "string",
      description: "Comma-separated memory IDs to merge (e.g. 3,7,12)",
      required: true,
    },
    claim: {
      type: "string",
      description: "Combined claim text for the merged memory",
      required: true,
    },
  },
  async run({ args }) {
    const idsRaw = args.ids as string;
    const claim = args.claim as string;

    if (!idsRaw?.trim()) {
      console.error(style.boldRed("error".padStart(10)), " --ids is required (comma-separated).");
      process.exitCode = 1;
      return;
    }
    if (!claim?.trim()) {
      console.error(style.boldRed("error".padStart(10)), " --claim is required.");
      process.exitCode = 1;
      return;
    }

    const ids = idsRaw
      .split(",")
      .map((s) => Number(s.trim()))
      .filter((n) => Number.isInteger(n) && n > 0);
    if (ids.length < 2) {
      console.error(
        style.boldRed("error".padStart(10)),
        " At least 2 valid memory IDs are required.",
      );
      process.exitCode = 1;
      return;
    }

    await withRunDb((db) => {
      for (const id of ids) {
        const mem = getMemory(db, id);
        if (!mem) {
          console.error(style.boldRed("error".padStart(10)), ` Memory #${id} not found.`);
          process.exitCode = 1;
          return;
        }
        if (mem.supersededBy !== null) {
          console.error(
            style.boldRed("error".padStart(10)),
            ` Memory #${id} is already superseded.`,
          );
          process.exitCode = 1;
          return;
        }
      }

      try {
        const embedding = embedText(claim.trim());
        const created = storeMemory(db, claim.trim(), embedding, { source: "explicit" });
        supersedeMemories(db, ids, created.id);
        const idList = ids.map((i) => `#${i}`).join(", ");
        console.log(
          style.cyan("merged".padStart(10)),
          ` ${idList} -> #${created.id} "${claim.trim().slice(0, 50)}"`,
        );
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        console.error(style.boldRed("error".padStart(10)), ` ${msg}`);
        process.exitCode = 1;
      }
    });
  },
});

import { defineCommand } from "citty";
import { revertSoulTrait } from "../../harness/public/souls.ts";
import { style } from "../../lib/terminal/index.ts";
import { withRunDb } from "./with_run_db.ts";

export default defineCommand({
  meta: { name: "revert-trait", description: "Revert a revised trait to its previous version" },
  args: {
    traitId: {
      type: "positional",
      description: "Trait ID (shown in 'souls show')",
      required: true,
    },
  },
  async run({ args }) {
    const raw = (args._ ?? []).join(" ") || (args.traitId as string);
    const traitId = Number(raw);
    if (!Number.isInteger(traitId) || traitId < 1) {
      console.error(style.boldRed("error".padStart(10)), " A valid numeric trait ID is required.");
      process.exitCode = 1;
      return;
    }

    await withRunDb((db) => {
      try {
        revertSoulTrait(db, traitId);
        console.log(style.cyan("reverted".padStart(10)), ` trait #${traitId}`);
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        console.error(style.boldRed("error".padStart(10)), ` ${msg}`);
        process.exitCode = 1;
      }
    });
  },
});

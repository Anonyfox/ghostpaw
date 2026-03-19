import { defineCommand } from "citty";
import { reviseSoulTrait } from "../../harness/public/souls.ts";
import { style } from "../../lib/terminal/index.ts";
import { withRunDb } from "./with_run_db.ts";

export default defineCommand({
  meta: { name: "revise-trait", description: "Revise a trait's principle or provenance" },
  args: {
    traitId: {
      type: "positional",
      description: "Trait ID (shown in 'souls show')",
      required: true,
    },
    principle: {
      type: "string",
      description: "New principle text",
    },
    provenance: {
      type: "string",
      description: "New provenance text",
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

    const principle = args.principle as string | undefined;
    const provenance = args.provenance as string | undefined;

    if (!principle?.trim() && !provenance?.trim()) {
      console.error(
        style.boldRed("error".padStart(10)),
        " At least one of --principle or --provenance is required.",
      );
      process.exitCode = 1;
      return;
    }

    await withRunDb((db) => {
      try {
        const input: Record<string, string> = {};
        if (principle?.trim()) input.principle = principle.trim();
        if (provenance?.trim()) input.provenance = provenance.trim();

        reviseSoulTrait(db, traitId, input);
        console.log(style.cyan("revised".padStart(10)), ` trait #${traitId}`);
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        console.error(style.boldRed("error".padStart(10)), ` ${msg}`);
        process.exitCode = 1;
      }
    });
  },
});

import { defineCommand } from "citty";
import { listPairingWisdom } from "../../core/trail/api/read/index.ts";
import { style } from "../../lib/terminal/index.ts";
import { withRunDb } from "./with_run_db.ts";

export default defineCommand({
  meta: { name: "wisdom", description: "Show pairing wisdom by category" },
  args: {
    category: {
      type: "string",
      description:
        "Filter by category: tone, framing, timing, initiative, workflow, boundaries, other",
    },
  },
  async run({ args }) {
    const category = (args.category as string | undefined) || undefined;

    await withRunDb((db) => {
      try {
        const entries = listPairingWisdom(db, {
          category: category as
            | "tone"
            | "framing"
            | "timing"
            | "initiative"
            | "workflow"
            | "boundaries"
            | "other"
            | undefined,
        });

        if (entries.length === 0) {
          console.log(style.dim("No pairing wisdom yet. Run a trail sweep first."));
          return;
        }

        const grouped = new Map<string, typeof entries>();
        for (const e of entries) {
          const list = grouped.get(e.category) ?? [];
          list.push(e);
          grouped.set(e.category, list);
        }

        console.log(
          style.dim(`  wisdom  ${entries.length} patterns across ${grouped.size} categories`),
        );
        console.log();

        for (const [cat, items] of grouped) {
          console.log(
            `  ${style.dim("──")} ${style.cyan(cat)} (${items.length} patterns) ${style.dim("──")}`,
          );
          for (const w of items) {
            const conf = w.confidence.toFixed(2).padStart(5);
            const ev = String(w.evidenceCount).padStart(3);
            console.log(`     "${w.pattern}"   ${style.dim(`conf ${conf}  ev${ev}`)}`);
          }
          console.log();
        }
      } catch {
        console.log(style.dim("Trail tables not initialized."));
      }
    });
  },
});

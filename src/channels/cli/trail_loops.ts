import { defineCommand } from "citty";
import { listOpenLoops } from "../../core/trail/api/read/index.ts";
import { style } from "../../lib/terminal/index.ts";
import { withRunDb } from "./with_run_db.ts";

export default defineCommand({
  meta: { name: "loops", description: "Show open loops (threads)" },
  args: {
    status: {
      type: "string",
      description: "Filter by status: alive, dormant, resolved, dismissed (default: alive)",
    },
    limit: {
      type: "string",
      description: "Max entries to show (default: 20)",
    },
  },
  async run({ args }) {
    const status = ((args.status as string | undefined) || "alive") as
      | "alive"
      | "dormant"
      | "resolved"
      | "dismissed";
    const limit = args.limit ? Number.parseInt(args.limit as string, 10) : 20;

    await withRunDb((db) => {
      try {
        const loops = listOpenLoops(db, { status, limit });

        if (loops.length === 0) {
          console.log(style.dim(`No ${status} loops found.`));
          return;
        }

        console.log(style.dim(`  loops  ${loops.length} ${status}`));
        console.log();

        const header = `${"ID".padStart(5)}   ${"Description".padEnd(45)} ${"Sig".padStart(4)}  ${"Status".padEnd(9)} ${"Action"}`;
        console.log(style.dim(header));
        console.log(style.dim("─".repeat(80)));

        for (const l of loops) {
          const id = String(l.id).padStart(5);
          const desc =
            l.description.length > 43 ? `${l.description.slice(0, 42)}…` : l.description.padEnd(43);
          const sig = String(l.significance).padStart(4);
          const st = l.status.padEnd(9);
          const action = l.recommendedAction ?? "";
          console.log(`${style.dim(id)}   ${desc} ${style.cyan(sig)}  ${st} ${style.dim(action)}`);
        }
      } catch {
        console.log(style.dim("Trail tables not initialized."));
      }
    });
  },
});

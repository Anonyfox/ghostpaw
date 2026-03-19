import { defineCommand } from "citty";
import { listChronicleEntries } from "../../core/trail/api/read/index.ts";
import { style } from "../../lib/terminal/index.ts";
import { withRunDb } from "./with_run_db.ts";

export default defineCommand({
  meta: { name: "chronicle", description: "Show recent chronicle entries" },
  args: {
    limit: {
      type: "string",
      description: "Number of entries to show (default: 5)",
    },
  },
  async run({ args }) {
    const limit = args.limit ? Number.parseInt(args.limit as string, 10) : 5;

    await withRunDb((db) => {
      try {
        const entries = listChronicleEntries(db, { limit });

        if (entries.length === 0) {
          console.log(style.dim("No chronicle entries yet. Run a trail sweep first."));
          return;
        }

        console.log(style.dim(`  chronicle  showing ${entries.length} most recent entries`));
        console.log();

        for (const e of entries) {
          console.log(`  ${style.dim("──")} ${style.cyan(e.date)} ${style.dim("─".repeat(40))}`);
          console.log(`  ${style.bold(e.title)}`);

          const lines = e.narrative.split("\n").filter((l) => l.trim());
          for (const line of lines.slice(0, 3)) {
            console.log(`  ${line}`);
          }
          if (lines.length > 3) {
            console.log(style.dim(`  ... ${lines.length - 3} more lines`));
          }

          const counts: string[] = [];
          const h = safeJsonArray(e.highlights);
          const s = safeJsonArray(e.surprises);
          const u = safeJsonArray(e.unresolved);
          if (h.length > 0) counts.push(`${h.length} highlight${h.length > 1 ? "s" : ""}`);
          if (s.length > 0) counts.push(`${s.length} surprise${s.length > 1 ? "s" : ""}`);
          if (u.length > 0) counts.push(`${u.length} unresolved`);
          if (counts.length > 0) console.log(style.dim(`  ${counts.join(" · ")}`));
          console.log();
        }
      } catch {
        console.log(style.dim("Trail tables not initialized."));
      }
    });
  },
});

function safeJsonArray(raw: string | null): unknown[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

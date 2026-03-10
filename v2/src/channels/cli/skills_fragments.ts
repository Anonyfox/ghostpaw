import { defineCommand } from "citty";
import { fragmentCountsBySource, listFragments } from "../../core/skills/index.ts";
import { style } from "../../lib/terminal/index.ts";
import { withRunDb } from "./with_run_db.ts";

const SOURCE_COLORS: Record<string, (s: string) => string> = {
  quest: (s) => `\x1b[33m${s}\x1b[0m`,
  session: (s) => `\x1b[34m${s}\x1b[0m`,
  stoke: (s) => `\x1b[35m${s}\x1b[0m`,
  coordinator: (s) => `\x1b[36m${s}\x1b[0m`,
  historian: (s) => style.dim(s),
};

function relativeAge(ts: number): string {
  const secs = Math.floor(Date.now() / 1000) - ts;
  if (secs < 3600) return `${Math.max(1, Math.floor(secs / 60))}m`;
  if (secs < 86400) return `${Math.floor(secs / 3600)}h`;
  return `${Math.floor(secs / 86400)}d`;
}

export default defineCommand({
  meta: { name: "fragments", description: "List pending skill fragments" },
  async run() {
    await withRunDb(async (db) => {
      const frags = listFragments(db, { status: "pending" });
      const counts = fragmentCountsBySource(db);

      if (frags.length === 0) {
        console.log(style.dim("No pending fragments."));
        return;
      }

      console.log(style.cyan(`Fragment Stash (${frags.length} pending)`));
      console.log();

      const header = `${"Source".padEnd(12)} ${"Observation".padEnd(44)} ${"Domain".padEnd(12)} ${"Age".padStart(4)}`;
      console.log(style.dim(header));
      console.log(style.dim("\u2500".repeat(76)));

      for (const f of frags) {
        const colorFn = SOURCE_COLORS[f.source] ?? style.dim;
        const dot = colorFn("\u25cf");
        const src = f.source.padEnd(10);
        const obs =
          f.observation.length > 42
            ? `${f.observation.slice(0, 41)}\u2026`
            : f.observation.padEnd(42);
        const domain = (f.domain ?? "").padEnd(12);
        const age = relativeAge(f.createdAt).padStart(4);
        console.log(`${dot} ${src} ${style.dim(obs)} ${style.dim(domain)} ${age}`);
      }

      const hints = Object.entries(counts)
        .filter(([, c]) => c.pending > 0)
        .map(([src, c]) => `${c.pending} ${src}`)
        .join(", ");
      if (hints) {
        console.log();
        console.log(style.dim(`  ? ${hints}`));
      }
    });
  },
});

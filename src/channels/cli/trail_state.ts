import { defineCommand } from "citty";
import { getCompiledPreamble, getTrailState } from "../../core/trail/api/read/index.ts";
import { style } from "../../lib/terminal/index.ts";
import { withRunDb } from "./with_run_db.ts";

function relativeAge(ts: number): string {
  const diff = Date.now() - ts;
  const mins = Math.floor(diff / 60_000);
  if (mins < 60) return `${mins}m`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h`;
  const days = Math.floor(hrs / 24);
  return `${days}d`;
}

export default defineCommand({
  meta: { name: "state", description: "Show current trail state — chapter, trailmarks, preamble" },
  async run() {
    await withRunDb((db) => {
      try {
        const state = getTrailState(db);
        const preamble = getCompiledPreamble(db);

        if (!state.chapter && state.recentTrailmarks.length === 0 && !preamble) {
          console.log(style.dim("No trail data yet. Run a trail sweep first."));
          return;
        }

        const f = (label: string, val: string) =>
          console.log(`${style.dim(label.padStart(12))}  ${val}`);

        if (state.chapter) {
          f("chapter", style.cyan(`${state.chapter.label} (${state.momentum})`));
        } else {
          f("chapter", style.dim("none"));
        }

        if (state.recentTrailmarks.length > 0) {
          f("trailmarks", "");
          for (const m of state.recentTrailmarks.slice(0, 8)) {
            console.log(`${"".padStart(14)}◈ ${m.description} (${relativeAge(m.createdAt)} ago)`);
          }
        }

        if (preamble) {
          f("preamble", `"${preamble.text}"`);
        }
      } catch {
        console.log(style.dim("Trail tables not initialized."));
      }
    });
  },
});

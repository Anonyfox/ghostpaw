import { defineCommand } from "citty";
import { executeTurnIn } from "../../harness/quest/turn_in.ts";
import { style } from "../../lib/terminal/index.ts";
import { errorLine } from "./quests_format.ts";
import { withRunDb } from "./with_run_db.ts";

export default defineCommand({
  meta: { name: "turn-in", description: "Turn in a completed quest to reveal rewards" },
  args: {
    id: {
      type: "positional",
      description: "Quest ID",
      required: true,
    },
  },
  async run({ args }) {
    const raw = (args._ ?? [])[0] || (args.id as string);
    const id = Number(raw);
    if (!Number.isInteger(id) || id <= 0) {
      errorLine("Quest ID must be a positive integer.");
      return;
    }

    try {
      await withRunDb((db) => {
        const summary = executeTurnIn(db, id);
        console.log(style.green("turned in".padStart(10)), ` #${id} "${summary.quest.title}"`);
        if (summary.revealedShards > 0) {
          console.log(
            style.cyan("shards".padStart(10)),
            ` ${summary.revealedShards} soul shard${summary.revealedShards !== 1 ? "s" : ""} revealed`,
          );
        }
        if (summary.fragmentDropped) {
          console.log(style.cyan("fragment".padStart(10)), " skill fragment dropped");
        }
        if (summary.xpEarned > 0) {
          console.log(style.cyan("xp".padStart(10)), ` ${summary.xpEarned} XP earned`);
        }
      });
    } catch (err) {
      errorLine(err instanceof Error ? err.message : String(err));
    }
  },
});

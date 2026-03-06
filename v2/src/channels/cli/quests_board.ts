import { defineCommand } from "citty";
import { listQuests } from "../../core/quests/index.ts";
import { style } from "../../lib/terminal/index.ts";
import { boardIcon, relativeAge, statusLabel } from "./quests_format.ts";
import { withRunDb } from "./with_run_db.ts";

export default defineCommand({
  meta: { name: "board", description: "Show the Quest Board — offered quests awaiting acceptance" },
  async run() {
    await withRunDb((db) => {
      const quests = listQuests(db, { status: "offered", limit: 100 });

      if (quests.length === 0) {
        console.log(style.dim("Quest Board is empty. Offer quests with: ghostpaw quests offer \"title\""));
        return;
      }

      console.log(style.yellow(`  ${quests.length} on the Quest Board`));
      console.log();

      for (const q of quests) {
        const id = `#${q.id}`.padStart(6);
        const icon = boardIcon(q.createdBy);
        const title = q.title.length > 36 ? `${q.title.slice(0, 35)}…` : q.title.padEnd(36);
        const pri = q.priority !== "normal" ? style.dim(q.priority.padEnd(7)) : "".padEnd(7);
        const age = style.dim(relativeAge(q.createdAt).padStart(4));
        const by = style.dim(q.createdBy);
        console.log(`  ${style.dim(id)} ${icon} ${title} ${pri} ${by} ${age}`);
      }
    });
  },
});

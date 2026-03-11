import { defineCommand } from "citty";
import { listShards } from "../../core/souls/api/read/index.ts";
import { style } from "../../lib/terminal/index.ts";
import { withRunDb } from "./with_run_db.ts";

export default defineCommand({
  meta: { name: "shards", description: "List pending soulshards" },
  async run() {
    await withRunDb((db) => {
      const shards = listShards(db, { status: "pending", limit: 50 });

      if (shards.length === 0) {
        console.log(style.dim("No pending soulshards."));
        return;
      }

      const header = `${"ID".padStart(4)} ${"Source".padEnd(12)} ${"Souls".padEnd(16)} Observation`;
      console.log(style.dim(header));
      console.log(style.dim("─".repeat(84)));

      for (const s of shards) {
        const id = String(s.id).padStart(4);
        const source = s.source.padEnd(12);
        const souls = s.soulIds.join(",").padEnd(16);
        const obs = s.observation.slice(0, 48);
        console.log(`${style.dim(id)} ${style.cyan(source)} ${souls} ${obs}`);
      }
    });
  },
});

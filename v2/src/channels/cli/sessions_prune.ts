import { defineCommand } from "citty";
import { style } from "../../lib/terminal/index.ts";
import { withRunDb } from "./with_run_db.ts";

export default defineCommand({
  meta: { name: "prune", description: "Delete empty sessions older than 1 hour" },
  args: {},
  async run() {
    await withRunDb((db) => {
      const oneHourAgo = Date.now() - 60 * 60 * 1000;

      const activeRunExclusion = `
        AND id NOT IN (
          SELECT parent_session_id FROM delegation_runs WHERE status = 'running'
          UNION
          SELECT child_session_id FROM delegation_runs
            WHERE status = 'running' AND child_session_id IS NOT NULL
        )`;

      const countRow = db
        .prepare(
          `SELECT COUNT(*) AS cnt FROM sessions
          WHERE created_at < ?
            AND id NOT IN (SELECT DISTINCT session_id FROM messages)
            ${activeRunExclusion}`,
        )
        .get(oneHourAgo) as unknown as { cnt: number };

      if (countRow.cnt === 0) {
        console.log(style.dim("No empty sessions to prune."));
        return;
      }

      const result = db
        .prepare(
          `DELETE FROM sessions
          WHERE created_at < ?
            AND id NOT IN (SELECT DISTINCT session_id FROM messages)
            ${activeRunExclusion}`,
        )
        .run(oneHourAgo);

      console.log(style.cyan("pruned".padStart(10)), ` ${result.changes} empty sessions`);
    });
  },
});

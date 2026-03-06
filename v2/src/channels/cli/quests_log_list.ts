import { defineCommand } from "citty";
import type { QuestLogStatus } from "../../core/quests/index.ts";
import { getQuestLogProgress, listQuestLogs } from "../../core/quests/index.ts";
import { style } from "../../lib/terminal/index.ts";
import { progressBar, relativeAge, relativeDue } from "./quests_format.ts";
import { withRunDb } from "./with_run_db.ts";

export default defineCommand({
  meta: { name: "log-list", description: "List quest logs" },
  args: {
    status: {
      type: "string",
      description: "Filter: active, completed, archived",
    },
    limit: {
      type: "string",
      description: "Maximum results (default: 50)",
    },
  },
  async run({ args }) {
    await withRunDb((db) => {
      const limit = args.limit ? Number.parseInt(args.limit as string, 10) : 50;

      const logs = listQuestLogs(db, {
        status: args.status as QuestLogStatus | undefined,
        limit,
      });

      if (logs.length === 0) {
        console.log(style.dim("No quest logs found."));
        return;
      }

      console.log(style.dim(`${logs.length} quest log${logs.length !== 1 ? "s" : ""}`));
      const header = `${"ID".padStart(5)}  ${"Title".padEnd(22)} ${"Status".padEnd(10)} ${"Progress".padEnd(16)} ${"Due".padStart(10)} ${"Age".padStart(4)}`;
      console.log(style.dim(header));
      console.log(style.dim("─".repeat(74)));

      for (const log of logs) {
        const id = String(log.id).padStart(5);
        const title = log.title.length > 20 ? `${log.title.slice(0, 19)}…` : log.title.padEnd(20);
        const status = log.status.padEnd(10);
        const progress = getQuestLogProgress(db, log.id);
        const bar = progressBar(progress.done, progress.total);
        const due = log.dueAt ? relativeDue(log.dueAt).padStart(10) : "".padStart(10);
        const age = relativeAge(log.createdAt).padStart(4);
        console.log(
          `${style.dim(id)}  ${style.cyan(title)} ${style.dim(status)} ${bar.padEnd(16)} ${due} ${style.dim(age)}`,
        );
      }
    });
  },
});

import { defineCommand } from "citty";
import { getQuestLog, getQuestLogProgress, listQuests } from "../../core/quests/index.ts";
import { style } from "../../lib/terminal/index.ts";
import {
  errorLine,
  formatDate,
  progressBar,
  questRow,
  questTableHeader,
  relativeAge,
  relativeDue,
} from "./quests_format.ts";
import { withRunDb } from "./with_run_db.ts";

export default defineCommand({
  meta: { name: "log-show", description: "Show quest log details and its quests" },
  args: {
    id: {
      type: "positional",
      description: "Quest log ID",
      required: true,
    },
  },
  async run({ args }) {
    const raw = (args._ ?? [])[0] || (args.id as string);
    const id = Number(raw);
    if (!Number.isInteger(id) || id <= 0) {
      errorLine("Quest log ID must be a positive integer.");
      return;
    }

    await withRunDb((db) => {
      const log = getQuestLog(db, id);
      if (!log) {
        errorLine(`Quest log #${id} not found.`);
        return;
      }

      console.log(style.cyan(`Quest Log #${log.id} — ${log.title}`));
      console.log();

      if (log.description) {
        console.log(log.description);
        console.log();
      }

      const progress = getQuestLogProgress(db, log.id);
      console.log(style.dim("── Details ──"));
      const f = (label: string, val: string) =>
        console.log(`${style.dim(label.padStart(12))}  ${val}`);

      f("status", log.status);
      f("progress", progressBar(progress.done, progress.total, 15));
      f(
        "breakdown",
        `${progress.pending} pending / ${progress.active} active / ${progress.blocked} blocked / ${progress.done} done`,
      );
      f("created by", log.createdBy);
      f("created", `${formatDate(log.createdAt)} (${relativeAge(log.createdAt)} ago)`);
      f("updated", `${formatDate(log.updatedAt)} (${relativeAge(log.updatedAt)} ago)`);
      if (log.dueAt) f("due", `${formatDate(log.dueAt)} (${relativeDue(log.dueAt)})`);
      if (log.completedAt)
        f("completed", `${formatDate(log.completedAt)} (${relativeAge(log.completedAt)} ago)`);

      const quests = listQuests(db, { questLogId: log.id, limit: 100 });
      if (quests.length > 0) {
        console.log();
        console.log(style.dim(`── Quests (${quests.length}) ──`));
        console.log(questTableHeader());
        for (const q of quests) {
          console.log(questRow(q));
        }
      }
    });
  },
});

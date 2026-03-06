import { defineCommand } from "citty";
import { getQuest, listOccurrences } from "../../core/quests/index.ts";
import { style } from "../../lib/terminal/index.ts";
import { errorLine, formatDate, relativeAge, relativeDue, statusLabel } from "./quests_format.ts";
import { withRunDb } from "./with_run_db.ts";

export default defineCommand({
  meta: { name: "show", description: "Show full details for a quest" },
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

    await withRunDb((db) => {
      const q = getQuest(db, id);
      if (!q) {
        errorLine(`Quest #${id} not found.`);
        return;
      }

      console.log(style.cyan(`Quest #${q.id} — ${q.title}`));
      console.log();

      if (q.description) {
        console.log(q.description);
        console.log();
      }

      console.log(style.dim("── Details ──"));
      const f = (label: string, val: string) =>
        console.log(`${style.dim(label.padStart(12))}  ${val}`);

      f("status", statusLabel(q.status));
      f("priority", q.priority);
      if (q.tags) f("tags", q.tags);
      if (q.questLogId) f("quest log", `#${q.questLogId}`);
      f("created by", q.createdBy);
      f("created", `${formatDate(q.createdAt)} (${relativeAge(q.createdAt)} ago)`);
      f("updated", `${formatDate(q.updatedAt)} (${relativeAge(q.updatedAt)} ago)`);

      if (q.startsAt) f("starts", `${formatDate(q.startsAt)} (${relativeAge(q.startsAt)} ago)`);
      if (q.endsAt) f("ends", `${formatDate(q.endsAt)}`);
      if (q.dueAt) f("due", `${formatDate(q.dueAt)} (${relativeDue(q.dueAt)})`);
      if (q.remindAt) f("remind at", formatDate(q.remindAt));
      if (q.remindedAt) f("reminded", formatDate(q.remindedAt));
      if (q.completedAt) f("completed", `${formatDate(q.completedAt)} (${relativeAge(q.completedAt)} ago)`);
      if (q.rrule) f("recurrence", q.rrule);

      if (q.rrule) {
        const occs = listOccurrences(db, q.id, { limit: 10 });
        if (occs.length > 0) {
          console.log();
          console.log(style.dim(`── Recent occurrences (${occs.length}) ──`));
          for (const o of occs) {
            const oId = `#${o.id}`.padStart(6);
            const at = formatDate(o.occurrenceAt);
            const st = o.status === "skipped" ? style.yellow(o.status) : style.green(o.status);
            console.log(`  ${style.dim(oId)} ${at}  ${st}`);
          }
        } else {
          console.log();
          console.log(style.dim("No occurrences recorded yet."));
        }
      }
    });
  },
});

import { defineCommand } from "citty";
import { getXPByQuest } from "../../core/chat/api/read/index.ts";
import {
  estimateQuestCost,
  getQuest,
  getStreakInfo,
  listOccurrences,
  listSubgoals,
} from "../../core/quests/api/read/index.ts";
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
      if (q.storylineId) {
        const pos = q.position != null ? ` (position ${q.position})` : "";
        f("storyline", `#${q.storylineId}${pos}`);
      }
      f("created by", q.createdBy);
      f("created", `${formatDate(q.createdAt)} (${relativeAge(q.createdAt)} ago)`);
      f("updated", `${formatDate(q.updatedAt)} (${relativeAge(q.updatedAt)} ago)`);

      if (q.startsAt) f("starts", `${formatDate(q.startsAt)} (${relativeAge(q.startsAt)} ago)`);
      if (q.endsAt) f("ends", `${formatDate(q.endsAt)}`);
      if (q.dueAt) f("due", `${formatDate(q.dueAt)} (${relativeDue(q.dueAt)})`);
      if (q.remindAt) f("remind at", formatDate(q.remindAt));
      if (q.remindedAt) f("reminded", formatDate(q.remindedAt));
      if (q.completedAt)
        f("completed", `${formatDate(q.completedAt)} (${relativeAge(q.completedAt)} ago)`);
      if (q.rrule) f("recurrence", q.rrule);

      const subgoals = listSubgoals(db, q.id);
      if (subgoals.length > 0) {
        const doneCount = subgoals.filter((s) => s.done).length;
        console.log();
        console.log(style.dim(`── Subgoals (${doneCount}/${subgoals.length} done) ──`));
        for (const s of subgoals) {
          const mark = s.done ? style.green("[x]") : "[ ]";
          console.log(`  ${mark} ${s.text}`);
        }
      }

      const xp = getXPByQuest(db, q.id);
      if (xp > 0) {
        console.log();
        console.log(style.dim("── XP ──"));
        console.log(`  ${style.cyan(String(Math.round(xp)))} XP earned`);
      }

      const isTerminal = ["done", "failed", "abandoned"].includes(q.status);
      if (!isTerminal) {
        const est = estimateQuestCost(db, q.id);
        if (est.confidence !== "none") {
          console.log();
          console.log(style.dim("── Cost Estimate ──"));
          console.log(
            `  $${est.low.toFixed(4)} – $${est.high.toFixed(4)} ${style.dim(`(${est.confidence}, ${est.sampleSize} samples)`)}`,
          );
          if (est.avgXP > 0) console.log(`  ~${Math.round(est.avgXP)} XP expected`);
        }
      }

      if (q.rrule) {
        const streak = getStreakInfo(db, q.id);
        if (streak && (streak.totalDone > 0 || streak.totalSkipped > 0)) {
          console.log();
          console.log(style.dim("── Streak ──"));
          const s = (label: string, val: string | number) =>
            console.log(`  ${style.dim(label)}  ${val}`);
          s("Current:", style.cyan(String(streak.currentStreak)));
          s("Longest:", String(streak.longestStreak));
          s("   Done:", String(streak.totalDone));
          s("Skipped:", String(streak.totalSkipped));
        }

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

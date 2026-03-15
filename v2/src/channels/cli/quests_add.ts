import { defineCommand } from "citty";
import type { QuestCreator, QuestPriority } from "../../core/quests/api/types.ts";
import { createQuest } from "../../core/quests/api/write/index.ts";
import { style } from "../../lib/terminal/index.ts";
import { errorLine, parseTimestamp } from "./quests_format.ts";
import { withRunDb } from "./with_run_db.ts";

export default defineCommand({
  meta: { name: "add", description: "Create a new quest" },
  args: {
    title: {
      type: "positional",
      description: "Quest title",
      required: true,
    },
    desc: {
      type: "string",
      description: "Description (markdown)",
    },
    priority: {
      type: "string",
      description: "Priority: low, normal, high, urgent (default: normal)",
    },
    log: {
      type: "string",
      description: "Attach to quest log by ID",
    },
    tags: {
      type: "string",
      description: "Comma-separated tags",
    },
    due: {
      type: "string",
      description: "Due date (ISO 8601 or unix ms)",
    },
    starts: {
      type: "string",
      description: "Start time (ISO 8601 or unix ms)",
    },
    ends: {
      type: "string",
      description: "End time (ISO 8601 or unix ms)",
    },
    remind: {
      type: "string",
      description: "Reminder time (ISO 8601 or unix ms)",
    },
    rrule: {
      type: "string",
      description: "iCalendar RRULE for recurrence",
    },
    by: {
      type: "string",
      description: "Creator: human (default) or ghost",
    },
  },
  async run({ args }) {
    const title = (args._ ?? []).join(" ") || (args.title as string);
    if (!title?.trim()) {
      errorLine("Quest title is required.");
      return;
    }

    try {
      await withRunDb((db) => {
        const q = createQuest(db, {
          title: title.trim(),
          description: args.desc as string | undefined,
          priority: (args.priority as QuestPriority) ?? undefined,
          questLogId: args.log ? Number.parseInt(args.log as string, 10) : undefined,
          tags: args.tags as string | undefined,
          dueAt: args.due ? parseTimestamp(args.due as string) : undefined,
          startsAt: args.starts ? parseTimestamp(args.starts as string) : undefined,
          endsAt: args.ends ? parseTimestamp(args.ends as string) : undefined,
          remindAt: args.remind ? parseTimestamp(args.remind as string) : undefined,
          rrule: args.rrule as string | undefined,
          createdBy: (args.by as QuestCreator) ?? undefined,
        });

        console.log(style.cyan("stored".padStart(10)), ` #${q.id} "${q.title}"`);

        const meta: string[] = [];
        if (q.priority !== "normal") meta.push(`priority: ${q.priority}`);
        if (q.questLogId) meta.push(`log: #${q.questLogId}`);
        if (q.dueAt) meta.push(`due: ${new Date(q.dueAt).toISOString().slice(0, 10)}`);
        if (q.rrule) meta.push(`recurs: ${q.rrule}`);
        if (meta.length > 0) {
          console.log(style.dim(`${"".padStart(10)}  ${meta.join(" | ")}`));
        }
      });
    } catch (err) {
      errorLine(err instanceof Error ? err.message : String(err));
    }
  },
});

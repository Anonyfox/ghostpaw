import { defineCommand } from "citty";
import type { QuestPriority, QuestStatus, UpdateQuestInput } from "../../core/quests/index.ts";
import { updateQuest } from "../../core/quests/index.ts";
import { style } from "../../lib/terminal/index.ts";
import { errorLine, parseTimestamp } from "./quests_format.ts";
import { withRunDb } from "./with_run_db.ts";

const CLEARABLE = ["desc", "tags", "log", "due", "starts", "ends", "remind", "rrule"] as const;

export default defineCommand({
  meta: { name: "update", description: "Modify a quest" },
  args: {
    id: {
      type: "positional",
      description: "Quest ID",
      required: true,
    },
    title: { type: "string", description: "New title" },
    desc: { type: "string", description: "New description" },
    status: { type: "string", description: "New status: pending, active, blocked, done, failed, cancelled" },
    priority: { type: "string", description: "New priority: low, normal, high, urgent" },
    log: { type: "string", description: "Move to quest log ID" },
    tags: { type: "string", description: "New comma-separated tags" },
    due: { type: "string", description: "New due date (ISO 8601 or unix ms)" },
    starts: { type: "string", description: "New start time (ISO 8601 or unix ms)" },
    ends: { type: "string", description: "New end time (ISO 8601 or unix ms)" },
    remind: { type: "string", description: "New reminder time (ISO 8601 or unix ms)" },
    rrule: { type: "string", description: "New RRULE" },
    clear: { type: "string", description: `Clear a field: ${CLEARABLE.join(", ")}` },
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
        const input: UpdateQuestInput = {};

        if (args.title) input.title = args.title as string;
        if (args.desc) input.description = args.desc as string;
        if (args.status) input.status = args.status as QuestStatus;
        if (args.priority) input.priority = args.priority as QuestPriority;
        if (args.tags) input.tags = args.tags as string;
        if (args.rrule) input.rrule = args.rrule as string;

        if (args.log) {
          input.questLogId = Number.parseInt(args.log as string, 10);
        }
        if (args.due) input.dueAt = parseTimestamp(args.due as string);
        if (args.starts) input.startsAt = parseTimestamp(args.starts as string);
        if (args.ends) input.endsAt = parseTimestamp(args.ends as string);
        if (args.remind) input.remindAt = parseTimestamp(args.remind as string);

        if (args.clear) {
          const field = args.clear as string;
          const map: Record<string, () => void> = {
            desc: () => { input.description = null; },
            tags: () => { input.tags = null; },
            log: () => { input.questLogId = null; },
            due: () => { input.dueAt = null; },
            starts: () => { input.startsAt = null; },
            ends: () => { input.endsAt = null; },
            remind: () => { input.remindAt = null; },
            rrule: () => { input.rrule = null; },
          };
          if (!map[field]) {
            errorLine(`Cannot clear "${field}". Clearable fields: ${CLEARABLE.join(", ")}`);
            return;
          }
          map[field]();
        }

        const updated = updateQuest(db, id, input);
        console.log(
          style.cyan("updated".padStart(10)),
          ` #${updated.id} "${updated.title}" [${updated.status}]`,
        );
      });
    } catch (err) {
      errorLine(err instanceof Error ? err.message : String(err));
    }
  },
});

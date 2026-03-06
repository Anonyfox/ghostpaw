import { defineCommand } from "citty";
import type { QuestLogStatus, UpdateQuestLogInput } from "../../core/quests/index.ts";
import { updateQuestLog } from "../../core/quests/index.ts";
import { style } from "../../lib/terminal/index.ts";
import { errorLine, parseTimestamp } from "./quests_format.ts";
import { withRunDb } from "./with_run_db.ts";

const CLEARABLE = ["desc", "due"] as const;

export default defineCommand({
  meta: { name: "log-update", description: "Modify a quest log" },
  args: {
    id: {
      type: "positional",
      description: "Quest log ID",
      required: true,
    },
    title: { type: "string", description: "New title" },
    desc: { type: "string", description: "New description" },
    status: { type: "string", description: "New status: active, completed, archived" },
    due: { type: "string", description: "New deadline (ISO 8601 or unix ms)" },
    clear: { type: "string", description: `Clear a field: ${CLEARABLE.join(", ")}` },
  },
  async run({ args }) {
    const raw = (args._ ?? [])[0] || (args.id as string);
    const id = Number(raw);
    if (!Number.isInteger(id) || id <= 0) {
      errorLine("Quest log ID must be a positive integer.");
      return;
    }

    try {
      await withRunDb((db) => {
        const input: UpdateQuestLogInput = {};

        if (args.title) input.title = args.title as string;
        if (args.desc) input.description = args.desc as string;
        if (args.status) input.status = args.status as QuestLogStatus;
        if (args.due) input.dueAt = parseTimestamp(args.due as string);

        if (args.clear) {
          const field = args.clear as string;
          const map: Record<string, () => void> = {
            desc: () => { input.description = null; },
            due: () => { input.dueAt = null; },
          };
          if (!map[field]) {
            errorLine(`Cannot clear "${field}". Clearable fields: ${CLEARABLE.join(", ")}`);
            return;
          }
          map[field]();
        }

        const log = updateQuestLog(db, id, input);
        console.log(
          style.cyan("updated".padStart(10)),
          ` #${log.id} "${log.title}" [${log.status}]`,
        );
      });
    } catch (err) {
      errorLine(err instanceof Error ? err.message : String(err));
    }
  },
});

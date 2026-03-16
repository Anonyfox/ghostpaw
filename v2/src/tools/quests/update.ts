import { createTool, Schema } from "chatoyant";
import { getQuest } from "../../core/quests/api/read/index.ts";
import type { QuestPriority, QuestStatus } from "../../core/quests/api/types.ts";
import { QUEST_PRIORITIES, QUEST_STATUSES } from "../../core/quests/api/types.ts";
import { updateQuest } from "../../core/quests/api/write/index.ts";
import type { DatabaseHandle } from "../../lib/index.ts";
import { formatQuest } from "./format_quest.ts";

class QuestUpdateParams extends Schema {
  id = Schema.Integer({
    description: "Quest ID to update.",
  });
  title = Schema.String({
    optional: true,
    description: "New title.",
  });
  description = Schema.String({
    optional: true,
    description: "New description. Pass empty string to clear.",
  });
  status = Schema.Enum([...QUEST_STATUSES] as unknown as readonly string[], {
    optional: true,
    description:
      "New status. Transitions to 'done'/'failed'/'abandoned' set completed_at automatically.",
  });
  priority = Schema.Enum([...QUEST_PRIORITIES] as unknown as readonly string[], {
    optional: true,
    description: "New priority: low, normal, high, urgent.",
  });
  storylineId = Schema.Integer({
    optional: true,
    description: "Assign to or move between storylines. Use 0 to unassign.",
  });
  tags = Schema.String({
    optional: true,
    description: "New comma-separated tags. Pass empty string to clear.",
  });
  dueAt = Schema.Integer({
    optional: true,
    description: "New due date (Unix ms). Use 0 to clear.",
  });
  startsAt = Schema.Integer({
    optional: true,
    description: "New start time (Unix ms). Use 0 to clear.",
  });
  endsAt = Schema.Integer({
    optional: true,
    description: "New end time (Unix ms). Use 0 to clear.",
  });
  remindAt = Schema.Integer({
    optional: true,
    description: "New reminder time (Unix ms). Use 0 to clear.",
  });
  rrule = Schema.String({
    optional: true,
    description: "New RRULE. Pass empty string to clear.",
  });
}

export function createQuestUpdateTool(db: DatabaseHandle) {
  return createTool({
    name: "quest_update",
    description:
      "Update any field on an existing quest. Only provide fields you want to change. " +
      "Use 0 for temporal fields or empty string for text fields to clear them. " +
      "Status transitions are validated — terminal states set completed_at automatically.",
    // biome-ignore lint/suspicious/noExplicitAny: chatoyant SchemaInstance index-signature limitation
    parameters: new QuestUpdateParams() as any,
    execute: async ({ args }) => {
      const a = args as {
        id: number;
        title?: string;
        description?: string;
        status?: QuestStatus;
        priority?: QuestPriority;
        storylineId?: number;
        tags?: string;
        dueAt?: number;
        startsAt?: number;
        endsAt?: number;
        remindAt?: number;
        rrule?: string;
      };

      if (!Number.isInteger(a.id) || a.id <= 0) {
        return { error: "Valid quest ID is required." };
      }

      const existing = getQuest(db, a.id);
      if (!existing) return { error: `Quest #${a.id} not found.` };

      const input: Record<string, unknown> = {};
      if (a.title !== undefined) input.title = a.title;
      if (a.description !== undefined) input.description = a.description || null;
      if (a.status !== undefined) input.status = a.status;
      if (a.priority !== undefined) input.priority = a.priority;
      if (a.storylineId !== undefined)
        input.storylineId = a.storylineId === 0 ? null : a.storylineId;
      if (a.tags !== undefined) input.tags = a.tags || null;
      if (a.dueAt !== undefined) input.dueAt = a.dueAt === 0 ? null : a.dueAt;
      if (a.startsAt !== undefined) input.startsAt = a.startsAt === 0 ? null : a.startsAt;
      if (a.endsAt !== undefined) input.endsAt = a.endsAt === 0 ? null : a.endsAt;
      if (a.remindAt !== undefined) input.remindAt = a.remindAt === 0 ? null : a.remindAt;
      if (a.rrule !== undefined) input.rrule = a.rrule || null;

      try {
        const updated = updateQuest(db, a.id, input);
        return { quest: formatQuest(updated) };
      } catch (err) {
        return {
          error: `Failed to update quest: ${err instanceof Error ? err.message : String(err)}`,
        };
      }
    },
  });
}

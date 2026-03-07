import { createTool, Schema } from "chatoyant";
import type { QuestPriority, QuestStatus } from "../../core/quests/index.ts";
import {
  DEFAULT_EXCLUDE_STATUSES,
  getTemporalContext,
  listQuests,
  QUEST_PRIORITIES,
  QUEST_STATUSES,
} from "../../core/quests/index.ts";
import type { DatabaseHandle } from "../../lib/index.ts";
import { formatQuestBrief } from "./format_quest.ts";

class QuestListParams extends Schema {
  status = Schema.Enum([...QUEST_STATUSES] as unknown as readonly string[], {
    optional: true,
    description:
      "Filter by exact status. When set, default exclusions are cleared. " +
      "Use 'offered' to see the Quest Board.",
  });
  priority = Schema.Enum([...QUEST_PRIORITIES] as unknown as readonly string[], {
    optional: true,
    description: "Filter by priority.",
  });
  questLogId = Schema.Integer({
    optional: true,
    description: "Filter by quest log ID.",
  });
  query = Schema.String({
    optional: true,
    description: "Full-text search across titles and descriptions.",
  });
  includeAll = Schema.Boolean({
    optional: true,
    description:
      "If true, show all quests including done/cancelled/offered. " +
      "By default, offered and terminal statuses are excluded.",
  });
  temporal = Schema.Boolean({
    optional: true,
    description:
      "If true, return temporal context instead: overdue, due soon, reminders, " +
      "today's events, and active quests. Ignores other filters.",
  });
  limit = Schema.Integer({
    optional: true,
    description: "Max results. Default: 50.",
  });
}

export function createQuestListTool(db: DatabaseHandle) {
  return createTool({
    name: "quest_list",
    description:
      "Browse or search quests. Without arguments returns active quests (excludes " +
      "offered/done/failed/cancelled). Use 'temporal: true' for a time-aware overview " +
      "of what needs attention. Use 'query' for full-text search. Use 'status: offered' " +
      "to see the Quest Board.",
    // biome-ignore lint/suspicious/noExplicitAny: chatoyant SchemaInstance index-signature limitation
    parameters: new QuestListParams() as any,
    execute: async ({ args }) => {
      const a = args as {
        status?: QuestStatus;
        priority?: QuestPriority;
        questLogId?: number;
        query?: string;
        includeAll?: boolean;
        temporal?: boolean;
        limit?: number;
      };

      if (a.temporal) {
        const ctx = getTemporalContext(db);
        return {
          overdue: ctx.overdue.map(formatQuestBrief),
          dueSoon: ctx.dueSoon.map(formatQuestBrief),
          reminders: ctx.pendingReminders.map(formatQuestBrief),
          today: ctx.todayEvents.map(formatQuestBrief),
          active: ctx.activeQuests.map(formatQuestBrief),
        };
      }

      const hasExplicitStatus = !!a.status;
      const quests = listQuests(db, {
        status: a.status,
        priority: a.priority,
        questLogId: a.questLogId,
        query: a.query?.trim() || undefined,
        excludeStatuses:
          hasExplicitStatus || a.includeAll ? undefined : [...DEFAULT_EXCLUDE_STATUSES],
        limit: a.limit ?? 50,
      });

      if (quests.length === 0) {
        return {
          quests: [],
          note: a.query ? "No quests match the search." : "No quests found with current filters.",
        };
      }

      return { quests: quests.map(formatQuestBrief), total: quests.length };
    },
  });
}

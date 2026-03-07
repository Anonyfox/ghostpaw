import { createTool, Schema } from "chatoyant";
import type { QuestCreator, QuestPriority, QuestStatus } from "../../core/quests/index.ts";
import { createQuest, QUEST_PRIORITIES, QUEST_STATUSES } from "../../core/quests/index.ts";
import type { DatabaseHandle } from "../../lib/index.ts";
import { formatQuest } from "./format_quest.ts";

class QuestCreateParams extends Schema {
  title = Schema.String({
    description: "Quest title. Short and specific.",
  });
  description = Schema.String({
    optional: true,
    description: "Longer description. Markdown supported.",
  });
  status = Schema.Enum([...QUEST_STATUSES] as unknown as readonly string[], {
    optional: true,
    description:
      "Initial status. 'pending' (default) for accepted work, 'offered' to place on " +
      "the Quest Board as a proposal/idea. Other statuses rarely needed at creation.",
  });
  priority = Schema.Enum([...QUEST_PRIORITIES] as unknown as readonly string[], {
    optional: true,
    description: "Priority: low, normal (default), high, urgent.",
  });
  questLogId = Schema.Integer({
    optional: true,
    description: "Assign to a quest log (storyline) by ID.",
  });
  tags = Schema.String({
    optional: true,
    description: "Comma-separated tags for categorization.",
  });
  dueAt = Schema.Integer({
    optional: true,
    description: "Due date as Unix ms timestamp.",
  });
  startsAt = Schema.Integer({
    optional: true,
    description: "Event start time as Unix ms timestamp.",
  });
  endsAt = Schema.Integer({
    optional: true,
    description: "Event end time as Unix ms timestamp.",
  });
  remindAt = Schema.Integer({
    optional: true,
    description: "Reminder time as Unix ms timestamp.",
  });
  rrule = Schema.String({
    optional: true,
    description: "iCalendar RRULE for recurring quests, e.g. 'FREQ=WEEKLY;BYDAY=MO,WE,FR'.",
  });
}

export function createQuestCreateTool(db: DatabaseHandle) {
  return createTool({
    name: "quest_create",
    description:
      "Create a new quest. Only title is required. Use status 'offered' to propose " +
      "an idea to the Quest Board, or omit for direct 'pending'. All temporal fields " +
      "are Unix ms timestamps — compute them with datetime tool if needed.",
    // biome-ignore lint/suspicious/noExplicitAny: chatoyant SchemaInstance index-signature limitation
    parameters: new QuestCreateParams() as any,
    execute: async ({ args }) => {
      const a = args as {
        title: string;
        description?: string;
        status?: QuestStatus;
        priority?: QuestPriority;
        questLogId?: number;
        tags?: string;
        dueAt?: number;
        startsAt?: number;
        endsAt?: number;
        remindAt?: number;
        rrule?: string;
      };

      if (!a.title?.trim()) {
        return { error: "Title must not be empty." };
      }

      try {
        const quest = createQuest(db, {
          title: a.title.trim(),
          description: a.description,
          status: a.status,
          priority: a.priority,
          questLogId: a.questLogId,
          tags: a.tags,
          createdBy: "ghost" as QuestCreator,
          dueAt: a.dueAt,
          startsAt: a.startsAt,
          endsAt: a.endsAt,
          remindAt: a.remindAt,
          rrule: a.rrule,
        });
        return { quest: formatQuest(quest) };
      } catch (err) {
        return {
          error: `Failed to create quest: ${err instanceof Error ? err.message : String(err)}`,
        };
      }
    },
  });
}

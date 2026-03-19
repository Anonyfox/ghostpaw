import { createTool, Schema } from "chatoyant";
import { listSubgoals } from "../../core/quests/api/read/index.ts";
import {
  addSubgoal,
  completeSubgoal,
  removeSubgoal,
  reorderSubgoals,
} from "../../core/quests/api/write/index.ts";
import type { DatabaseHandle } from "../../lib/index.ts";

class SubgoalsParams extends Schema {
  action = Schema.String({
    description: 'Action to perform: "list", "add", "done", "remove", or "reorder".',
  });
  quest_id = Schema.Integer({
    optional: true,
    description: "Quest ID. Required for list, add, and reorder.",
  });
  id = Schema.Integer({
    optional: true,
    description: "Subgoal ID. Required for done and remove.",
  });
  text = Schema.String({
    optional: true,
    description: "Subgoal text. Required for add.",
  });
  position = Schema.Integer({
    optional: true,
    description: "Position index. Optional for add.",
  });
  ordered_ids = Schema.Array(Schema.Integer(), {
    optional: true,
    description: "Ordered array of subgoal IDs. Required for reorder.",
  });
}

export function createQuestSubgoalsTool(db: DatabaseHandle) {
  return createTool({
    name: "quest_subgoals",
    description:
      "Manage quest subgoals — dynamic execution checkpoints within a quest. " +
      "Actions: list (show subgoals for a quest), add (create a new subgoal), " +
      "done (mark a subgoal complete), remove (delete a subgoal), " +
      "reorder (set subgoal order).",
    // biome-ignore lint/suspicious/noExplicitAny: chatoyant SchemaInstance index-signature limitation
    parameters: new SubgoalsParams() as any,
    execute: async ({ args }) => {
      const { action, quest_id, id, text, position, ordered_ids } = args as {
        action: string;
        quest_id?: number;
        id?: number;
        text?: string;
        position?: number;
        ordered_ids?: number[];
      };

      try {
        switch (action) {
          case "list": {
            if (!quest_id) return { error: "quest_id is required for list." };
            const items = listSubgoals(db, quest_id);
            return {
              quest_id,
              subgoals: items.map((s) => ({
                id: s.id,
                text: s.text,
                done: s.done,
                position: s.position,
              })),
              summary: `${items.filter((s) => s.done).length}/${items.length} done`,
            };
          }
          case "add": {
            if (!quest_id) return { error: "quest_id is required for add." };
            if (!text) return { error: "text is required for add." };
            const added = addSubgoal(db, quest_id, text, position);
            return {
              subgoal: { id: added.id, text: added.text, position: added.position },
              note: "Subgoal added.",
            };
          }
          case "done": {
            if (!id) return { error: "id is required for done." };
            const completed = completeSubgoal(db, id);
            return {
              subgoal: { id: completed.id, text: completed.text, done: true },
              note: "Subgoal marked done.",
            };
          }
          case "remove": {
            if (!id) return { error: "id is required for remove." };
            removeSubgoal(db, id);
            return { note: `Subgoal #${id} removed.` };
          }
          case "reorder": {
            if (!quest_id) return { error: "quest_id is required for reorder." };
            if (!ordered_ids?.length) return { error: "ordered_ids is required for reorder." };
            reorderSubgoals(db, quest_id, ordered_ids);
            return { note: "Subgoals reordered." };
          }
          default:
            return { error: `Unknown action: ${action}` };
        }
      } catch (err) {
        return { error: err instanceof Error ? err.message : String(err) };
      }
    },
  });
}

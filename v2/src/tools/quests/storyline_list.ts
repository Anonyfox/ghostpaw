import { createTool, Schema } from "chatoyant";
import { getStorylineProgress, listStorylines } from "../../core/quests/api/read/index.ts";
import type { StorylineStatus } from "../../core/quests/api/types.ts";
import { STORYLINE_STATUSES } from "../../core/quests/api/types.ts";
import type { DatabaseHandle } from "../../lib/index.ts";
import { formatStoryline } from "./format_quest.ts";

class StorylineListParams extends Schema {
  status = Schema.Enum([...STORYLINE_STATUSES] as unknown as readonly string[], {
    optional: true,
    description: "Filter by status: active, completed, archived. Default: shows all.",
  });
}

export function createStorylineListTool(db: DatabaseHandle) {
  return createTool({
    name: "storyline_list",
    description:
      "List storylines with progress counts. Each storyline shows how many " +
      "quests are done, active, accepted, blocked, and offered.",
    // biome-ignore lint/suspicious/noExplicitAny: chatoyant SchemaInstance index-signature limitation
    parameters: new StorylineListParams() as any,
    execute: async ({ args }) => {
      const { status } = args as { status?: StorylineStatus };

      const storylines = listStorylines(db, { status });

      if (storylines.length === 0) {
        return {
          storylines: [],
          note: "No storylines yet. Use storyline_create to start a storyline.",
        };
      }

      return {
        storylines: storylines.map((s) => {
          const progress = getStorylineProgress(db, s.id);
          return formatStoryline(s, progress);
        }),
      };
    },
  });
}

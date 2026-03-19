import { createTool, Schema } from "chatoyant";
import { createStoryline } from "../../core/quests/api/write/index.ts";
import type { DatabaseHandle } from "../../lib/index.ts";
import { formatStoryline } from "./format_quest.ts";

class StorylineCreateParams extends Schema {
  title = Schema.String({
    description: "Storyline title.",
  });
  description = Schema.String({
    optional: true,
    description: "Description of what this storyline tracks.",
  });
  dueAt = Schema.Integer({
    optional: true,
    description: "Optional deadline for the entire storyline (Unix ms).",
  });
}

export function createStorylineCreateTool(db: DatabaseHandle) {
  return createTool({
    name: "storyline_create",
    description:
      "Create a storyline to group related quests. " +
      "Like an RPG quest chain or a project tracker.",
    // biome-ignore lint/suspicious/noExplicitAny: chatoyant SchemaInstance index-signature limitation
    parameters: new StorylineCreateParams() as any,
    execute: async ({ args }) => {
      const { title, description, dueAt } = args as {
        title: string;
        description?: string;
        dueAt?: number;
      };

      if (!title?.trim()) {
        return { error: "Title must not be empty." };
      }

      try {
        const storyline = createStoryline(db, {
          title: title.trim(),
          description,
          dueAt,
        });
        return { storyline: formatStoryline(storyline) };
      } catch (err) {
        return {
          error: `Failed to create storyline: ${err instanceof Error ? err.message : String(err)}`,
        };
      }
    },
  });
}

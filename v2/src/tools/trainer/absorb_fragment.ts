import { createTool, Schema } from "chatoyant";
import { absorbFragment } from "../../core/skills/index.ts";
import type { DatabaseHandle } from "../../lib/index.ts";

class AbsorbFragmentParams extends Schema {
  fragmentId = Schema.Integer({
    description: "ID of the fragment to mark as absorbed.",
  });
  skillName = Schema.String({
    description: "Name of the skill that absorbed this fragment.",
  });
}

export function createAbsorbFragmentTool(db: DatabaseHandle) {
  return createTool({
    name: "absorb_fragment",
    description:
      "Mark a skill fragment as absorbed by a specific skill after its content " +
      "has been incorporated during training. This closes the fragment lifecycle.",
    // biome-ignore lint/suspicious/noExplicitAny: chatoyant SchemaInstance index-signature limitation
    parameters: new AbsorbFragmentParams() as any,
    async execute({ args }) {
      const { fragmentId, skillName } = args as { fragmentId: number; skillName: string };

      if (!fragmentId || !skillName?.trim()) {
        return { error: "Both fragmentId and skillName are required." };
      }

      try {
        absorbFragment(db, fragmentId, skillName.trim());
        return { absorbed: true, fragmentId, skillName: skillName.trim() };
      } catch (err) {
        return { error: err instanceof Error ? err.message : String(err) };
      }
    },
  });
}

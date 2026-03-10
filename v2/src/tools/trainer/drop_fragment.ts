import { createTool, Schema } from "chatoyant";
import type { FragmentSource } from "../../core/skills/index.ts";
import { dropSkillFragment } from "../../core/skills/index.ts";
import type { DatabaseHandle } from "../../lib/index.ts";

class DropFragmentParams extends Schema {
  observation = Schema.String({
    description: "1-5 sentences of raw observation about a skill-relevant pattern.",
  });
  domain = Schema.String({
    description: 'Optional domain hint for routing (e.g. "deployment", "testing").',
    optional: true,
  });
}

export interface DropFragmentToolOptions {
  source?: FragmentSource;
  sourceId?: string | null;
}

export function createDropFragmentTool(db: DatabaseHandle, opts?: DropFragmentToolOptions) {
  const source: FragmentSource = opts?.source ?? "stoke";
  const sourceId = opts?.sourceId ?? null;

  return createTool({
    name: "drop_fragment",
    description:
      "Stash a raw skill observation (fragment) for later absorption into training. " +
      "Fragments are lightweight signals that accumulate silently and get routed to " +
      "matching skills during training or stoke.",
    // biome-ignore lint/suspicious/noExplicitAny: chatoyant SchemaInstance index-signature limitation
    parameters: new DropFragmentParams() as any,
    async execute({ args }) {
      const { observation, domain } = args as { observation: string; domain?: string };

      if (!observation?.trim()) return { error: "observation is required." };

      try {
        dropSkillFragment(db, source, sourceId, observation.trim(), domain?.trim());
        return { dropped: true };
      } catch (err) {
        return { error: err instanceof Error ? err.message : String(err) };
      }
    },
  });
}

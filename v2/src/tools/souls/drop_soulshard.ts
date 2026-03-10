import { createTool, Schema } from "chatoyant";
import type { ShardSource } from "../../core/souls/index.ts";
import { dropSoulshard, getSoulByName } from "../../core/souls/index.ts";
import type { DatabaseHandle } from "../../lib/index.ts";

class DropSoulshardParams extends Schema {
  observation = Schema.String({
    description:
      "1-3 sentences describing a behavioral pattern observed in a soul's judgment, " +
      "approach, or decision-making. Focus on cognitive patterns, not procedural steps.",
  });
  soul_names = Schema.String({
    description:
      'Comma-separated soul names this observation is relevant to (e.g. "JS Engineer, Ghostpaw"). ' +
      "Include all souls whose cognitive patterns are reflected in the observation.",
  });
}

interface DropSoulshardToolOptions {
  source?: ShardSource;
  sourceId?: string | null;
  sealed?: boolean;
}

export function createDropSoulshardTool(db: DatabaseHandle, opts?: DropSoulshardToolOptions) {
  const source: ShardSource = opts?.source ?? "session";
  const sourceId = opts?.sourceId ?? null;
  const sealed = opts?.sealed ?? false;

  return createTool({
    name: "drop_soulshard",
    description:
      "Stash a behavioral observation (soulshard) about a soul's cognitive patterns. " +
      "Soulshards accumulate silently and feed into the soul evolution pipeline " +
      "when enough evidence crystallizes. Only for cognitive patterns (judgment, " +
      "approach, reasoning style) — use drop_fragment for procedural/skill patterns.",
    // biome-ignore lint/suspicious/noExplicitAny: chatoyant SchemaInstance index-signature limitation
    parameters: new DropSoulshardParams() as any,
    async execute({ args }) {
      const { observation, soul_names } = args as { observation: string; soul_names: string };

      if (!observation?.trim()) return { error: "observation is required." };
      if (!soul_names?.trim()) return { error: "soul_names is required." };

      const names = soul_names
        .split(",")
        .map((n) => n.trim())
        .filter(Boolean);
      if (names.length === 0) return { error: "At least one soul name is required." };

      const soulIds: number[] = [];
      for (const name of names) {
        const soul = getSoulByName(db, name);
        if (!soul) return { error: `Soul "${name}" not found.` };
        soulIds.push(soul.id);
      }

      try {
        dropSoulshard(db, source, sourceId, observation.trim(), soulIds, sealed);
        return { dropped: true, soulNames: names };
      } catch (err) {
        return { error: err instanceof Error ? err.message : String(err) };
      }
    },
  });
}

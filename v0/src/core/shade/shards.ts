import { type SoulsDb, write } from "@ghostpaw/souls";
import type { DatabaseHandle } from "../../lib/database_handle.ts";
import { runInternalOneshot } from "../oneshot/internal_runner.ts";
import { renderSoul } from "../souls/render.ts";
import { runProcessor } from "./processor.ts";
import { buildShardsPrompt, SHARDS_SYSTEM_PROMPT } from "./shards_prompt.ts";

const PROCESSOR_NAME = "shards";

function parseShardTexts(output: string): string[] {
  if (output.trim() === "(none)") return [];
  return output
    .split(/\n\n+/)
    .map((s) => s.trim())
    .filter((s) => s.length > 0 && s !== "(none)");
}

export async function runShardsProcessor(
  db: DatabaseHandle,
  soulsDb: DatabaseHandle,
  model: string,
  signal: AbortSignal,
): Promise<{ processed: number; errors: number }> {
  return runProcessor(
    db,
    PROCESSOR_NAME,
    async (_db, impression) => {
      const soulBaseline = renderSoul(soulsDb, impression.soul_id);
      const userPrompt = buildShardsPrompt(soulBaseline, impression.impressions);

      const result = await runInternalOneshot({
        db,
        model,
        systemPrompt: SHARDS_SYSTEM_PROMPT,
        userPrompt,
        purpose: "shade",
        parentSessionId: impression.session_id,
        title: `shade_shards:${impression.id}`,
      });

      const shardTexts = parseShardTexts(result.content);

      for (const text of shardTexts) {
        write.dropShard(soulsDb as unknown as SoulsDb, {
          content: text,
          source: "shade",
          soulIds: [impression.soul_id],
        });
      }

      return {
        resultCount: shardTexts.length,
        processSessionId: result.sessionId,
      };
    },
    signal,
  );
}

import type { DatabaseHandle } from "../../lib/database_handle.ts";
import { runInternalOneshot } from "../oneshot/internal_runner.ts";
import { buildIngestPrompt, INGEST_SYSTEM_PROMPT } from "./ingest_prompt.ts";
import { loadSegmentMessages, loadSegmentToolInfo } from "./load_segment_messages.ts";
import { readUningestedSegments } from "./read_uningested_segments.ts";
import { writeImpression } from "./write_impression.ts";

export function parseImpressionCount(text: string): number {
  if (text.trim() === "(none)") return 0;
  return text
    .split(/\n\n+/)
    .map((s) => s.trim())
    .filter((s) => s.length > 0 && s !== "(none)").length;
}

export async function runShadeIngest(
  db: DatabaseHandle,
  model: string,
  signal: AbortSignal,
): Promise<{ ingested: number; skipped: number }> {
  const segments = readUningestedSegments(db);
  let ingested = 0;
  let skipped = 0;

  for (const seg of segments) {
    if (signal.aborted) break;

    const messages = loadSegmentMessages(db, seg.session_id, seg.sealed_msg_id);
    const hasAgentContent = messages.some((m) => m.role === "user" || m.role === "assistant");
    if (!hasAgentContent) {
      writeImpression(db, {
        sessionId: seg.session_id,
        sealedMsgId: seg.sealed_msg_id,
        soulId: seg.soul_id,
        impressions: "",
        impressionCount: 0,
        ingestSessionId: null,
      });
      skipped++;
      continue;
    }

    const toolInfo = loadSegmentToolInfo(db, messages);
    const userPrompt = buildIngestPrompt(messages, toolInfo);

    const result = await runInternalOneshot({
      db,
      model,
      systemPrompt: INGEST_SYSTEM_PROMPT,
      userPrompt,
      purpose: "shade",
      parentSessionId: seg.session_id,
      title: `shade_ingest:${seg.session_id}:${seg.sealed_msg_id}`,
    });

    const impressionCount = parseImpressionCount(result.content);

    writeImpression(db, {
      sessionId: seg.session_id,
      sealedMsgId: seg.sealed_msg_id,
      soulId: seg.soul_id,
      impressions: result.content,
      impressionCount,
      ingestSessionId: result.sessionId,
    });

    ingested++;
  }

  return { ingested, skipped };
}

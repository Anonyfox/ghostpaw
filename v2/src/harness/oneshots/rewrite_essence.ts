import type { ChatFactory } from "../../core/chat/index.ts";
import {
  accumulateUsage,
  closeSession,
  createSession,
  executeTurn,
} from "../../core/chat/index.ts";
import { MANDATORY_SOUL_IDS, renderSoul } from "../../core/souls/index.ts";
import type { DatabaseHandle } from "../../lib/index.ts";

const SYSTEM_PROMPT = [
  "You are rewriting a soul's essence text after a level-up. This is the most",
  "critical prompt in the system — the essence IS the soul's identity.",
  "",
  "Rules:",
  "- Preserve the soul's voice, tone, and subliminal coding exactly.",
  "- Weave promoted trait principles into the narrative naturally, as if the",
  "  soul always knew them. They become part of identity, not bullet points.",
  "- Reflect consolidated trait merges as evolved understanding.",
  "- Do NOT add anything not evidenced by the provided traits.",
  "- Keep similar length — no inflation, no lossy compression.",
  "- Do NOT include markdown headers, metadata, or formatting instructions.",
  "- Output ONLY the rewritten essence text, nothing else.",
].join("\n");

export interface RewriteEssenceInput {
  soulName: string;
  soulId: number;
  currentEssence: string;
  description: string;
  promotedTraits: { principle: string; provenance: string }[];
  consolidatedTraits: { mergedPrinciple: string; sourcePrinciples: string[] }[];
  carriedTraits: { principle: string }[];
}

function buildPrompt(input: RewriteEssenceInput): string {
  const sections: string[] = [];

  sections.push(`Soul: ${input.soulName}`);
  if (input.description) sections.push(`Description: ${input.description}`);
  sections.push("");
  sections.push("## Current Essence");
  sections.push(input.currentEssence);

  if (input.promotedTraits.length > 0) {
    sections.push("");
    sections.push("## Promoted Traits (weave these into the essence as intrinsic knowledge)");
    for (const t of input.promotedTraits) {
      sections.push(`- ${t.principle} (evidence: ${t.provenance})`);
    }
  }

  if (input.consolidatedTraits.length > 0) {
    sections.push("");
    sections.push("## Consolidated Traits (merged understandings to reflect as evolved thinking)");
    for (const t of input.consolidatedTraits) {
      sections.push(
        `- Merged into: "${t.mergedPrinciple}" (from: ${t.sourcePrinciples.join("; ")})`,
      );
    }
  }

  if (input.carriedTraits.length > 0) {
    sections.push("");
    sections.push(
      "## Carried Traits (context only — do not alter these, they stay as separate traits)",
    );
    for (const t of input.carriedTraits) {
      sections.push(`- ${t.principle}`);
    }
  }

  sections.push("");
  sections.push("Rewrite the essence now. Output ONLY the essence text.");

  return sections.join("\n");
}

export async function rewriteEssence(
  db: DatabaseHandle,
  parentSessionId: number,
  input: RewriteEssenceInput,
  model: string,
  createChat: ChatFactory,
): Promise<string> {
  const soulContext = renderSoul(db, MANDATORY_SOUL_IDS["prompt-engineer"]);
  const systemPrompt = soulContext ? `${soulContext}\n\n${SYSTEM_PROMPT}` : SYSTEM_PROMPT;

  const session = createSession(db, `system:essence-rewrite:${input.soulId}:${Date.now()}`, {
    purpose: "system",
  });
  const sessionId = session.id as number;

  try {
    const result = await executeTurn(
      {
        sessionId,
        content: buildPrompt(input),
        systemPrompt,
        model,
        maxIterations: 1,
        maxTokens: 4000,
      },
      { db, tools: [], createChat },
    );

    accumulateUsage(db, parentSessionId, {
      tokensIn: result.usage.inputTokens,
      tokensOut: result.usage.outputTokens,
      reasoningTokens: result.usage.reasoningTokens,
      cachedTokens: result.usage.cachedTokens,
      costUsd: result.cost.estimatedUsd,
    });

    const rewritten = result.content.trim();
    if (!rewritten || rewritten.startsWith("Error:")) {
      throw new Error("Essence rewrite produced empty or error content.");
    }

    return rewritten;
  } finally {
    closeSession(db, sessionId);
  }
}

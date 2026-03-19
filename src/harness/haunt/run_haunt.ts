import { getSession } from "../../core/chat/api/read/index.ts";
import { createHowl, deliverHowl } from "../../core/chat/api/write/howls/index.ts";
import type { ChatFactory } from "../../core/chat/api/write/index.ts";
import {
  addMessage,
  closeSession,
  createSession,
  renameSession,
  type TurnResult,
} from "../../core/chat/api/write/index.ts";
import { getConfig } from "../../core/config/api/read/index.ts";
import { shouldSurfaceHowl } from "../../core/trail/api/read/index.ts";
import type { DatabaseHandle } from "../../lib/index.ts";
import { defaultChatFactory } from "../chat_factory.ts";
import { resolveModel } from "../model.ts";
import type { Entity } from "../types.ts";
import { analyzeHauntContext } from "./analyze.ts";
import { consolidateHaunt } from "./consolidate.ts";
import { extractSummary } from "./extract_summary.ts";
import { assembleHauntContext } from "./haunt_context.ts";
import { buildHauntPrompt, TEXT_ONLY_CONTINUATION, WRAP_UP } from "./haunt_prompt.ts";
import type { ConsolidationResult, HauntResult, RunHauntOptions } from "./types.ts";

const MAX_TOOL_ITERATIONS = 200;

function aggregateUsage(results: TurnResult[]): TurnResult["usage"] {
  const usage = {
    inputTokens: 0,
    outputTokens: 0,
    reasoningTokens: 0,
    cachedTokens: 0,
    totalTokens: 0,
  };
  for (const r of results) {
    usage.inputTokens += r.usage.inputTokens;
    usage.outputTokens += r.usage.outputTokens;
    usage.reasoningTokens += r.usage.reasoningTokens;
    usage.cachedTokens += r.usage.cachedTokens;
    usage.totalTokens += r.usage.totalTokens;
  }
  return usage;
}

function aggregateCost(results: TurnResult[]): TurnResult["cost"] {
  return { estimatedUsd: results.reduce((sum, r) => sum + r.cost.estimatedUsd, 0) };
}

function resolveConsolidationModel(db: DatabaseHandle, hauntModel?: string): string {
  const configured = getConfig(db, "haunt_consolidation_model");
  if (typeof configured === "string" && configured) return configured;
  return resolveModel(db, hauntModel);
}

export async function runHaunt(
  entity: Entity,
  db: DatabaseHandle,
  workspace: string,
  options?: RunHauntOptions,
): Promise<HauntResult> {
  const session = createSession(db, `haunt:${Date.now()}`, { purpose: "haunt" });
  const sessionId = session.id as number;
  const chatFactory: ChatFactory = options?.chatFactory ?? defaultChatFactory;

  const turns: TurnResult[] = [];
  const chunks: string[] = [];
  let analysis: ReturnType<typeof analyzeHauntContext> | null = null;

  try {
    analysis = analyzeHauntContext(db);
    const systemPrompt = assembleHauntContext(db, workspace, analysis);
    const openingPrompt = buildHauntPrompt(analysis);

    const turnOpts = {
      systemPrompt,
      model: options?.model,
      maxIterations: MAX_TOOL_ITERATIONS,
    };

    const first = await entity.executeTurn(sessionId, openingPrompt, turnOpts);
    turns.push(first);
    chunks.push(first.content);

    const usedTools = first.iterations > 1;
    if (first.succeeded && !usedTools) {
      try {
        const second = await entity.executeTurn(sessionId, TEXT_ONLY_CONTINUATION, turnOpts);
        turns.push(second);
        chunks.push(second.content);

        if (second.succeeded && second.content.trim().length > 0) {
          try {
            const third = await entity.executeTurn(sessionId, WRAP_UP, turnOpts);
            turns.push(third);
            chunks.push(third.content);
          } catch {
            /* wrap-up failed, non-fatal */
          }
        }
      } catch {
        /* continuation failed, non-fatal */
      }
    }
  } catch {
    /* first turn failed entirely */
  }

  const rawJournal = chunks.join("\n\n---\n\n") || "(empty)";

  let consolidation: ConsolidationResult | null = null;
  let summary: string;

  if (rawJournal !== "(empty)") {
    try {
      const consolidationModel = resolveConsolidationModel(db, options?.model);
      consolidation = await consolidateHaunt(
        db,
        sessionId,
        rawJournal,
        analysis?.seedMemories ?? [],
        consolidationModel,
        chatFactory,
      );
      summary = consolidation.summary;
    } catch {
      summary = extractSummary(chunks[chunks.length - 1] ?? rawJournal);
    }
  } else {
    summary = "(empty)";
  }

  if (summary !== "(empty)") {
    const head = getSession(db, sessionId)?.headMessageId ?? undefined;
    addMessage(db, {
      sessionId,
      role: "assistant",
      content: `**Consolidation Summary**\n\n${summary}`,
      parentId: head,
    });
  }

  renameSession(db, sessionId, summary);

  if (consolidation?.highlight) {
    let surface = true;
    try {
      surface = shouldSurfaceHowl(db).shouldSurface;
    } catch {
      /* fail-open: trail tables may not exist yet */
    }
    if (surface) {
      try {
        const howl = createHowl(db, {
          originSessionId: sessionId,
          originMessageId: getSession(db, sessionId)?.headMessageId ?? null,
          message: consolidation.highlight,
          urgency: "low",
        });
        await deliverHowl(db, howl);
      } catch {
        /* howl creation failed, non-fatal */
      }
    }
  }

  await entity.flush();
  closeSession(db, sessionId);

  const usage = aggregateUsage(turns);
  const cost = aggregateCost(turns);
  if (consolidation?.cost) {
    cost.estimatedUsd += consolidation.cost.estimatedUsd;
  }

  return {
    sessionId,
    summary,
    succeeded: chunks.length > 0,
    usage,
    cost,
    consolidation,
  };
}

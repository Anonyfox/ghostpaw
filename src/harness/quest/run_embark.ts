import { getSession } from "../../core/chat/api/read/index.ts";
import { type ChatFactory, closeSession, createSession } from "../../core/chat/api/write/index.ts";
import { getQuest, listSubgoals } from "../../core/quests/api/read/index.ts";
import { updateQuest } from "../../core/quests/api/write/index.ts";
import type { DatabaseHandle } from "../../lib/index.ts";
import { SpendLimitError } from "../../lib/index.ts";
import { log } from "../../lib/terminal/index.ts";
import { defaultChatFactory } from "../chat_factory.ts";
import { checkSpendLimit } from "../check_spend_limit.ts";
import { resolveModel } from "../model.ts";
import type { Entity } from "../types.ts";
import { consolidateEmbark } from "./consolidate_embark.ts";
import { buildEmbarkBriefing } from "./embark_context.ts";
import { planSubgoals } from "./plan_subgoals.ts";
import type { EmbarkOptions, EmbarkResult } from "./types.ts";
import { validateStep } from "./validate_step.ts";

const MAX_EMBARK_TURNS = 30;
const MAX_TURN_ITERATIONS = 50;
const MAX_CONSECUTIVE_REJECTIONS = 3;

export async function runEmbark(
  entity: Entity,
  db: DatabaseHandle,
  _workspace: string,
  questId: number,
  opts?: EmbarkOptions,
): Promise<EmbarkResult> {
  const chatFactory: ChatFactory = opts?.chatFactory ?? defaultChatFactory;
  const maxTurns = opts?.maxTurns ?? MAX_EMBARK_TURNS;
  const model = resolveModel(db, opts?.model);

  const quest = getQuest(db, questId);
  if (!quest) throw new Error(`Quest #${questId} not found`);
  if (
    quest.status === "done" ||
    quest.status === "turned_in" ||
    quest.status === "failed" ||
    quest.status === "abandoned"
  ) {
    throw new Error(`Quest #${questId} is already "${quest.status}"`);
  }

  if (quest.status === "accepted") {
    updateQuest(db, questId, { status: "active" });
  }

  const session = createSession(db, `quest:embark:${questId}:${Date.now()}`, {
    purpose: "quest",
    questId,
  });
  const sessionId = session.id as number;

  let turns = 0;
  let totalTokensIn = 0;
  let totalTokensOut = 0;
  let totalCost = 0;

  try {
    let subgoals = listSubgoals(db, questId);
    if (subgoals.length === 0) {
      log.info(`quest #${questId}: planning subgoals`);
      await planSubgoals(db, questId, model, chatFactory);
      subgoals = listSubgoals(db, questId);
    }

    let consecutiveRejections = 0;
    let wardenFeedback: string | undefined;

    for (let turn = 0; turn < maxTurns; turn++) {
      const currentQuest = getQuest(db, questId);
      if (!currentQuest) break;
      if (["done", "turned_in", "failed", "abandoned", "blocked"].includes(currentQuest.status))
        break;

      try {
        checkSpendLimit(db);
      } catch (err) {
        if (err instanceof SpendLimitError) {
          log.warn(`quest #${questId}: spend limit reached, pausing`);
          break;
        }
        throw err;
      }

      subgoals = listSubgoals(db, questId);
      const briefing = buildEmbarkBriefing(currentQuest, subgoals, wardenFeedback);

      let coordinatorOutput: string;
      try {
        const turnResult = await entity.executeTurn(sessionId, briefing, {
          model: opts?.model,
          maxIterations: MAX_TURN_ITERATIONS,
        });
        coordinatorOutput = turnResult.content;
        totalTokensIn += turnResult.usage.inputTokens;
        totalTokensOut += turnResult.usage.outputTokens;
        totalCost += turnResult.cost.estimatedUsd;
        turns++;
      } catch (err) {
        log.error(
          `quest #${questId}: coordinator turn failed: ${err instanceof Error ? err.message : String(err)}`,
        );
        break;
      }

      try {
        subgoals = listSubgoals(db, questId);
        wardenFeedback = await validateStep(
          db,
          currentQuest,
          subgoals,
          coordinatorOutput,
          model,
          chatFactory,
        );
      } catch (err) {
        log.warn(
          `quest #${questId}: validation failed, skipping: ${err instanceof Error ? err.message : String(err)}`,
        );
        wardenFeedback = undefined;
        continue;
      }

      const afterValidation = getQuest(db, questId);
      if (!afterValidation) break;
      if (["done", "turned_in", "failed", "abandoned", "blocked"].includes(afterValidation.status))
        break;

      const newSubgoals = listSubgoals(db, questId);
      const progressMade =
        newSubgoals.filter((s) => s.done).length > subgoals.filter((s) => s.done).length;

      if (progressMade) {
        consecutiveRejections = 0;
      } else if (wardenFeedback?.toLowerCase().includes("off track")) {
        consecutiveRejections++;
        if (consecutiveRejections >= MAX_CONSECUTIVE_REJECTIONS) {
          log.warn(
            `quest #${questId}: ${MAX_CONSECUTIVE_REJECTIONS} consecutive rejections, blocking`,
          );
          updateQuest(db, questId, { status: "blocked" });
          break;
        }
      } else {
        consecutiveRejections = 0;
      }
    }

    const finalQuest = getQuest(db, questId);
    const finalStatus = finalQuest?.status ?? "active";

    if (finalStatus === "done") {
      try {
        await consolidateEmbark(db, questId, model, chatFactory);
      } catch (err) {
        log.warn(
          `quest #${questId}: consolidation failed: ${err instanceof Error ? err.message : String(err)}`,
        );
      }
    }

    await entity.flush();
    closeSession(db, sessionId);
    const closedSession = getSession(db, sessionId);

    return {
      sessionId,
      questId,
      succeeded: finalStatus === "done",
      finalStatus,
      turns,
      usage: { tokensIn: totalTokensIn, tokensOut: totalTokensOut },
      cost: totalCost,
      xp: closedSession?.xpEarned ?? 0,
    };
  } finally {
    closeSession(db, sessionId);
  }
}

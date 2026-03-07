import type { TurnResult } from "../core/chat/index.ts";
import { executeTurn, streamTurn } from "../core/chat/index.ts";
import { MANDATORY_SOUL_IDS } from "../core/souls/index.ts";
import { defaultChatFactory } from "./chat_factory.ts";
import { checkSpendLimit } from "./check_spend_limit.ts";
import { checkTokenBudget } from "./check_token_budget.ts";
import { computeBudgetSummary } from "./compute_budget_summary.ts";
import { assembleContext } from "./context.ts";
import { resolveModel } from "./model.ts";
import { compactHistory } from "./oneshots/summarize_for_compaction.ts";
import { handlePostTurn } from "./post_turn.ts";
import { createEntityToolSets } from "./tools.ts";
import type { Entity, EntityOptions, EntityTurnOptions } from "./types.ts";

const COMPACTION_THRESHOLD = 50_000;

export function createEntity(options: EntityOptions): Entity {
  const { db, workspace } = options;
  const chatFactory = options.chatFactory ?? defaultChatFactory;
  let activeSessionId: number | null = null;
  const pendingWork: Promise<void>[] = [];

  function trackWork(p: Promise<void> | null): void {
    if (!p) return;
    pendingWork.push(p);
    p.finally(() => {
      const idx = pendingWork.indexOf(p);
      if (idx !== -1) pendingWork.splice(idx, 1);
    });
  }

  const toolSets = createEntityToolSets({
    db,
    workspace,
    chatFactory,
    getParentSessionId: () => activeSessionId,
    onBackgroundComplete: options.onBackgroundComplete,
  });

  function buildTurnArgs(sessionId: number, content: string, opts?: EntityTurnOptions) {
    const model = resolveModel(db, opts?.model);
    const budgetSummary = computeBudgetSummary(db, sessionId) ?? undefined;
    const systemPrompt =
      opts?.systemPrompt ??
      assembleContext(db, workspace, content, {
        soulId: opts?.soulId,
        budgetSummary,
      });
    const isWarden = opts?.soulId === MANDATORY_SOUL_IDS.warden;
    const isChamberlain = opts?.soulId === MANDATORY_SOUL_IDS.chamberlain;
    const isMentor = opts?.soulId === MANDATORY_SOUL_IDS.mentor;
    const isTrainer = opts?.soulId === MANDATORY_SOUL_IDS.trainer;
    const tools = isWarden
      ? toolSets.wardenTools
      : isChamberlain
        ? toolSets.chamberlainTools
        : isMentor
          ? toolSets.allToolsWithMentor
          : isTrainer
            ? toolSets.allToolsWithTrainer
            : toolSets.baseTools;
    const turnInput = {
      sessionId,
      content,
      systemPrompt,
      model,
      compactionThreshold: COMPACTION_THRESHOLD,
      maxIterations: opts?.maxIterations,
      temperature: opts?.temperature,
      reasoning: opts?.reasoning,
      onToolCallStart: opts?.onToolCallStart,
      onToolCallComplete: opts?.onToolCallComplete,
    };
    const turnContext = { db, tools, createChat: chatFactory, compactFn: compactHistory };
    return { turnInput, turnContext, model };
  }

  return {
    db,
    workspace,

    async *streamTurn(sessionId, content, opts) {
      checkSpendLimit(db);
      checkTokenBudget(db, sessionId);
      const { turnInput, turnContext, model } = buildTurnArgs(sessionId, content, opts);
      activeSessionId = sessionId;
      try {
        const gen = streamTurn(turnInput, turnContext);
        let result: TurnResult;
        for (;;) {
          const next = await gen.next();
          if (next.done) {
            result = next.value;
            break;
          }
          yield next.value;
        }
        trackWork(
          handlePostTurn(db, sessionId, content, model, chatFactory, opts?.onTitleGenerated),
        );
        return result;
      } finally {
        activeSessionId = null;
      }
    },

    async executeTurn(sessionId, content, opts) {
      checkSpendLimit(db);
      checkTokenBudget(db, sessionId);
      const { turnInput, turnContext, model } = buildTurnArgs(sessionId, content, opts);
      activeSessionId = sessionId;
      try {
        const result = await executeTurn(turnInput, turnContext);
        trackWork(
          handlePostTurn(db, sessionId, content, model, chatFactory, opts?.onTitleGenerated),
        );
        return result;
      } finally {
        activeSessionId = null;
      }
    },

    async flush() {
      await Promise.allSettled([...pendingWork]);
      await toolSets.shutdown();
    },
  };
}

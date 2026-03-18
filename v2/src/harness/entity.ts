import { getHistory } from "../core/chat/api/read/index.ts";
import { executeTurn, streamTurn, type TurnResult } from "../core/chat/api/write/index.ts";
import { getConfig } from "../core/config/api/read/index.ts";
import { MANDATORY_SOUL_IDS } from "../core/souls/api/read/index.ts";
import { getSessionBriefing } from "../core/trail/api/read/index.ts";
import { defaultChatFactory } from "./chat_factory.ts";
import { checkSpendLimit } from "./check_spend_limit.ts";
import { assembleContext } from "./context.ts";
import { formatSessionBriefing } from "./format_session_briefing.ts";
import { getWarmth } from "./get_warmth.ts";
import { resolveModel } from "./model.ts";
import { compactHistory } from "./oneshots/summarize_for_compaction.ts";
import { handlePostTurn } from "./post_turn.ts";
import { createEntityToolSets } from "./tools.ts";
import type { Entity, EntityOptions, EntityTurnOptions } from "./types.ts";

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
    const systemPrompt =
      opts?.systemPrompt ?? assembleContext(db, workspace, { soulId: opts?.soulId });
    const isWarden = opts?.soulId === MANDATORY_SOUL_IDS.warden;
    const isChamberlain = opts?.soulId === MANDATORY_SOUL_IDS.chamberlain;
    const isMentor = opts?.soulId === MANDATORY_SOUL_IDS.mentor;
    const isTrainer = opts?.soulId === MANDATORY_SOUL_IDS.trainer;
    const isHistorian = opts?.soulId === MANDATORY_SOUL_IDS.historian;
    const tools =
      opts?.tools ??
      (isWarden
        ? toolSets.wardenTools
        : isChamberlain
          ? toolSets.chamberlainTools
          : isMentor
            ? toolSets.allToolsWithMentor
            : isTrainer
              ? toolSets.allToolsWithTrainer
              : isHistorian
                ? toolSets.allToolsWithHistorian
                : toolSets.baseTools);
    const isUserFacing = !isWarden && !isChamberlain && !isMentor && !isTrainer && !isHistorian;
    let effectivePrompt = systemPrompt;
    if (isUserFacing) {
      try {
        const history = getHistory(db, sessionId);
        if (history.length === 0) {
          const warmth = getWarmth(db);
          const briefing = formatSessionBriefing(getSessionBriefing(db), warmth);
          if (briefing) effectivePrompt = `${systemPrompt}\n\n${briefing}`;
        }
      } catch {
        /* fail-open: trail/pack/memory tables may not exist yet */
      }
    }

    const compactionThreshold = (getConfig(db, "compaction_threshold") as number | null) ?? 200_000;
    const turnInput = {
      sessionId,
      content,
      systemPrompt: effectivePrompt,
      model,
      compactionThreshold,
      maxIterations: opts?.maxIterations,
      temperature: opts?.temperature,
      reasoning: opts?.reasoning,
      replyToId: opts?.replyToId,
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

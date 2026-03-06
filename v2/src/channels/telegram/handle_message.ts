import type { TurnResult } from "../../core/chat/index.ts";
import { getPendingHowl, replyToHowl } from "../../core/howl/index.ts";
import type { Entity } from "../../harness/index.ts";
import { TokenBudgetError } from "../../lib/index.ts";
import { rotateSession } from "./rotate_session.ts";
import { sessionKeyForChat } from "./session_key.ts";
import { splitMessage } from "./split_message.ts";
import type { ReactionEmoji } from "./types.ts";

const TYPING_INTERVAL_MS = 4_000;

export interface HandleMessageDeps {
  entity: Entity;
  resolveSessionId: (chatId: number) => number;
  isAllowed: (chatId: number) => boolean;
  sendMessage: (chatId: number, text: string) => Promise<void>;
  sendTyping: (chatId: number) => Promise<void>;
  setReaction: (chatId: number, messageId: number, emoji: ReactionEmoji) => Promise<void>;
}

export async function handleMessage(
  deps: HandleMessageDeps,
  chatId: number,
  messageId: number,
  text: string,
): Promise<void> {
  if (!deps.isAllowed(chatId)) return;
  if (!text.trim()) return;

  await deps.setReaction(chatId, messageId, "\u{1F440}");

  await deps.sendTyping(chatId);
  const typingInterval = setInterval(() => {
    deps.sendTyping(chatId).catch(() => {});
  }, TYPING_INTERVAL_MS);

  try {
    const pendingHowl = getPendingHowl(deps.entity.db);
    let result: TurnResult;

    if (pendingHowl) {
      const reply = await replyToHowl(deps.entity.db, deps.entity, pendingHowl.id, text, {
        replyChannel: "telegram",
      });
      result = reply.turn;
    } else {
      result = await executeTurnWithRotation(deps, chatId, text);
    }

    clearInterval(typingInterval);
    await deps.setReaction(chatId, messageId, "\u{1F44D}");

    const parts = splitMessage(result.content);
    for (const part of parts) {
      await deps.sendMessage(chatId, part);
    }
  } catch (err) {
    clearInterval(typingInterval);
    await deps.setReaction(chatId, messageId, "\u{1F44E}").catch(() => {});

    const msg = err instanceof Error ? err.message : String(err);
    await deps.sendMessage(chatId, `Error: ${msg}`).catch(() => {});
  }
}

/**
 * Runs a turn, transparently rotating the session if the token budget is
 * exhausted. Rotation closes the spent session, opens a fresh one with the
 * same key, bridges the compaction summary, and retries the turn exactly once.
 * Any other error (daily limit, LLM failure) propagates unchanged.
 */
async function executeTurnWithRotation(
  deps: HandleMessageDeps,
  chatId: number,
  text: string,
): Promise<TurnResult> {
  const sessionId = deps.resolveSessionId(chatId);
  try {
    return await deps.entity.executeTurn(sessionId, text);
  } catch (err) {
    if (err instanceof TokenBudgetError && err.scope === "session") {
      const sessionKey = sessionKeyForChat(chatId);
      const newSessionId = rotateSession(deps.entity.db, sessionId, sessionKey);
      return deps.entity.executeTurn(newSessionId, text);
    }
    throw err;
  }
}

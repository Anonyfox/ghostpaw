import {
  getHowlByTelegramReplyTarget,
  getResolvableTelegramHowlFromPlainText,
} from "../../core/chat/api/read/howls/index.ts";
import { processHowlReply } from "../../harness/howl/index.ts";
import type { Entity } from "../../harness/index.ts";
import { splitMessage } from "./split_message.ts";
import type { ReactionEmoji } from "./types.ts";

const TYPING_INTERVAL_MS = 4_000;

export interface HandleMessageDeps {
  entity: Entity;
  resolveSessionId: (chatId: number) => number;
  isAllowed: (chatId: number) => boolean;
  sendMessage: (chatId: number, text: string) => Promise<unknown>;
  sendTyping: (chatId: number) => Promise<void>;
  setReaction: (chatId: number, messageId: number, emoji: ReactionEmoji) => Promise<void>;
}

export async function handleMessage(
  deps: HandleMessageDeps,
  chatId: number,
  messageId: number,
  text: string,
  replyToMessageId?: number,
): Promise<void> {
  if (!deps.isAllowed(chatId)) return;
  if (!text.trim()) return;

  await deps.setReaction(chatId, messageId, "\u{1F440}");

  await deps.sendTyping(chatId);
  const typingInterval = setInterval(() => {
    deps.sendTyping(chatId).catch(() => {});
  }, TYPING_INTERVAL_MS);

  try {
    const howl =
      (replyToMessageId
        ? getHowlByTelegramReplyTarget(deps.entity.db, chatId, replyToMessageId)
        : null) ?? getResolvableTelegramHowlFromPlainText(deps.entity.db, chatId);

    if (howl) {
      const reply = await processHowlReply(deps.entity.db, howl.id, text, {
        replyChannel: "telegram",
      });
      clearInterval(typingInterval);
      await deps.setReaction(chatId, messageId, "\u{1F44D}");

      const parts = splitMessage(reply.summary);
      for (const part of parts) {
        await deps.sendMessage(chatId, part);
      }
    } else {
      const sessionId = deps.resolveSessionId(chatId);
      const result = await deps.entity.executeTurn(sessionId, text);
      clearInterval(typingInterval);
      await deps.setReaction(chatId, messageId, "\u{1F44D}");

      const parts = splitMessage(result.content);
      for (const part of parts) {
        await deps.sendMessage(chatId, part);
      }
    }
  } catch (err) {
    clearInterval(typingInterval);
    await deps.setReaction(chatId, messageId, "\u{1F44E}").catch(() => {});

    const msg = err instanceof Error ? err.message : String(err);
    await deps.sendMessage(chatId, `Error: ${msg}`).catch(() => {});
  }
}

import {
  getHowlByTelegramReplyTarget,
  getResolvableTelegramHowlFromPlainText,
} from "../../core/chat/api/read/howls/index.ts";
import { lookupByChannelId } from "../../core/chat/api/read/index.ts";
import { storeChannelMessage } from "../../core/chat/api/write/index.ts";
import { processHowlReply } from "../../harness/howl/index.ts";
import type { Entity } from "../../harness/index.ts";
import { renderTelegramHtml } from "./render_telegram.ts";
import { splitMessage } from "./split_message.ts";
import type { ReactionEmoji, TelegramSendMessageOptions, TelegramSentMessage } from "./types.ts";

const TYPING_INTERVAL_MS = 4_000;

export interface HandleMessageDeps {
  entity: Entity;
  resolveSessionId: (chatId: number) => number;
  isAllowed: (chatId: number) => boolean;
  sendMessage: (
    chatId: number,
    text: string,
    options?: TelegramSendMessageOptions,
  ) => Promise<TelegramSentMessage>;
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
        await deps.sendMessage(chatId, renderTelegramHtml(part), { parseMode: "HTML" });
      }
    } else {
      const sessionId = deps.resolveSessionId(chatId);

      let replyToId: number | undefined;
      if (replyToMessageId) {
        const lookup = lookupByChannelId(deps.entity.db, "telegram", String(replyToMessageId));
        if (lookup) replyToId = lookup.messageId;
      }

      const result = await deps.entity.executeTurn(sessionId, text, { replyToId });
      clearInterval(typingInterval);
      await deps.setReaction(chatId, messageId, "\u{1F44D}");

      storeChannelMessage(deps.entity.db, {
        sessionId,
        messageId: result.userMessageId,
        channel: "telegram",
        channelMessageId: String(messageId),
        direction: "in",
      });

      const parts = splitMessage(result.content);
      for (const part of parts) {
        const sent = await deps.sendMessage(chatId, renderTelegramHtml(part), {
          replyToMessageId: messageId,
          parseMode: "HTML",
        });
        storeChannelMessage(deps.entity.db, {
          sessionId,
          messageId: result.messageId,
          channel: "telegram",
          channelMessageId: String(sent.messageId),
          direction: "out",
        });
      }
    }
  } catch (err) {
    clearInterval(typingInterval);
    await deps.setReaction(chatId, messageId, "\u{1F44E}").catch(() => {});

    const msg = err instanceof Error ? err.message : String(err);
    await deps.sendMessage(chatId, `Error: ${msg}`).catch(() => {});
  }
}

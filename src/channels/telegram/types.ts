import type { Bot } from "grammy";
import type { Entity } from "../../harness/index.ts";
import type { DatabaseHandle } from "../../lib/index.ts";

export type ReactionEmoji = "\u{1F440}" | "\u{1F44D}" | "\u{1F44E}";

export interface TelegramSentMessage {
  messageId: number;
}

export interface TelegramSendMessageOptions {
  dismissHowlId?: number;
  replyToMessageId?: number;
  parseMode?: "HTML";
}

export interface TelegramChannelConfig {
  token: string;
  db: DatabaseHandle;
  entity: Entity;
  allowedChatIds?: number[];
  bot?: Bot;
  sendMessage?: (
    chatId: number,
    text: string,
    options?: TelegramSendMessageOptions,
  ) => Promise<TelegramSentMessage>;
  sendTyping?: (chatId: number) => Promise<void>;
  setReaction?: (chatId: number, messageId: number, emoji: ReactionEmoji) => Promise<void>;
  deleteMessages?: (chatId: number, messageIds: number[]) => Promise<void>;
}

export interface TelegramChannel {
  readonly name: "telegram";
  start(): Promise<{ username: string }>;
  stop(): Promise<void>;
}

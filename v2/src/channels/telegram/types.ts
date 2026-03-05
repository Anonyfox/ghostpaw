import type { Bot } from "grammy";
import type { Entity } from "../../harness/index.ts";
import type { DatabaseHandle } from "../../lib/index.ts";

export type ReactionEmoji = "\u{1F440}" | "\u{1F44D}" | "\u{1F44E}";

export interface TelegramChannelConfig {
  token: string;
  db: DatabaseHandle;
  entity: Entity;
  allowedChatIds?: number[];
  bot?: Bot;
  sendMessage?: (chatId: number, text: string) => Promise<void>;
  sendTyping?: (chatId: number) => Promise<void>;
  setReaction?: (chatId: number, messageId: number, emoji: ReactionEmoji) => Promise<void>;
}

export interface TelegramChannel {
  readonly name: "telegram";
  start(): Promise<{ username: string }>;
  stop(): Promise<void>;
}

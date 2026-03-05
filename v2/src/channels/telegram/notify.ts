import { Bot } from "grammy";
import { addMessage, getOrCreateSession } from "../../core/chat/index.ts";
import type { DatabaseHandle } from "../../lib/index.ts";
import { sessionKeyForChat } from "./session_key.ts";
import { splitMessage } from "./split_message.ts";

export interface NotificationOptions {
  token: string;
  chatId: number;
  text: string;
  db?: DatabaseHandle;
  /** Override for testing — skip real Telegram API */
  send?: (chatId: number, text: string) => Promise<void>;
}

export async function sendNotification(opts: NotificationOptions): Promise<void> {
  const { token, chatId, text, db } = opts;

  if (db) {
    const session = getOrCreateSession(db, sessionKeyForChat(chatId), { purpose: "chat" });
    addMessage(db, { sessionId: session.id, role: "assistant", content: text });
  }

  const parts = splitMessage(text);
  if (opts.send) {
    for (const part of parts) {
      await opts.send(chatId, part);
    }
  } else {
    const bot = new Bot(token);
    for (const part of parts) {
      await bot.api.sendMessage(chatId, part);
    }
  }
}

import { resolve } from "node:path";
import { Bot } from "grammy";
import type { ChannelAdapter, ChannelRuntime } from "./runtime.js";

type ReactionEmoji = "👀" | "👍" | "👎";

const TYPING_INTERVAL_MS = 4_000;
const MAX_MESSAGE_LENGTH = 4096;
const CONNECTION_TIMEOUT_MS = 10_000;

export interface TelegramChannelConfig {
  token: string;
  runtime: ChannelRuntime;
  allowedChatIds?: number[];
  /** Override for testing — injected Bot instance */
  bot?: Bot;
  /** Override for testing — custom send function */
  sendMessage?: (chatId: number, text: string) => Promise<void>;
  /** Override for testing — custom typing indicator */
  sendTyping?: (chatId: number) => Promise<void>;
  /** Override for testing — custom reaction function */
  setReaction?: (chatId: number, messageId: number, emoji: ReactionEmoji) => Promise<void>;
}

export interface TelegramStartResult {
  username: string;
}

export function sessionKeyForChat(chatId: number): string {
  return `telegram:${chatId}`;
}

export function chatIdFromSessionKey(key: string): number | null {
  const match = key.match(/^telegram:(-?\d+)$/);
  return match ? Number(match[1]) : null;
}

export interface TelegramNotificationOptions {
  token: string;
  chatId: number;
  text: string;
  /**
   * If provided, the message is recorded in the session history so the
   * ongoing Telegram conversation stays coherent. Opens and closes the DB
   * within this call — safe to use from cronjobs alongside a running daemon.
   */
  workspace?: string;
}

/**
 * One-shot send: delivers a message to a Telegram chat without starting
 * long-polling. Use this for proactive notifications from scheduled tasks,
 * cronjobs, or autonomous agent runs. Never connects a listener — just sends
 * and returns.
 *
 * Pass `workspace` to record the message in the sticky session, so the next
 * conversation turn has full context of what was sent.
 */
export async function sendTelegramNotification(opts: TelegramNotificationOptions): Promise<void> {
  const { token, chatId, text, workspace } = opts;

  if (workspace) {
    const { createDatabase } = await import("../core/database.js");
    const { createSessionStore } = await import("../core/session.js");
    const dbPath = resolve(workspace, "ghostpaw.db");
    const db = await createDatabase(dbPath);
    try {
      const sessions = createSessionStore(db);
      const sessionKey = sessionKeyForChat(chatId);
      const session =
        sessions.getSessionByKey(sessionKey) ?? sessions.createSession(sessionKey, {});
      sessions.addMessage(session.id, { role: "assistant", content: text });
    } finally {
      db.close();
    }
  }

  const bot = new Bot(token);
  const parts = splitMessage(text);
  for (const part of parts) {
    await bot.api.sendMessage(chatId, part);
  }
}

export function splitMessage(text: string): string[] {
  if (text.length <= MAX_MESSAGE_LENGTH) return [text];

  const parts: string[] = [];
  let remaining = text;

  while (remaining.length > 0) {
    if (remaining.length <= MAX_MESSAGE_LENGTH) {
      parts.push(remaining);
      break;
    }

    let splitAt = remaining.lastIndexOf("\n", MAX_MESSAGE_LENGTH);
    if (splitAt <= 0) splitAt = remaining.lastIndexOf(" ", MAX_MESSAGE_LENGTH);
    if (splitAt <= 0) splitAt = MAX_MESSAGE_LENGTH;

    parts.push(remaining.slice(0, splitAt));
    remaining = remaining.slice(splitAt).trimStart();
  }

  return parts;
}

export function createTelegramChannel(config: TelegramChannelConfig): ChannelAdapter {
  const { token, runtime, allowedChatIds } = config;

  const bot = config.bot ?? new Bot(token);
  let typingTimers = new Map<number, ReturnType<typeof setInterval>>();
  let running = false;
  let connectedUsername: string | null = null;

  const sendMessage =
    config.sendMessage ??
    (async (chatId: number, text: string) => {
      await bot.api.sendMessage(chatId, text);
    });

  const sendTyping =
    config.sendTyping ??
    (async (chatId: number) => {
      await bot.api.sendChatAction(chatId, "typing");
    });

  const setReaction =
    config.setReaction ??
    (async (chatId: number, messageId: number, emoji: ReactionEmoji) => {
      await bot.api.setMessageReaction(chatId, messageId, [{ type: "emoji", emoji }]);
    });

  function startTyping(chatId: number): void {
    if (typingTimers.has(chatId)) return;
    sendTyping(chatId).catch(() => {});
    const interval = setInterval(() => {
      sendTyping(chatId).catch(() => {});
    }, TYPING_INTERVAL_MS);
    typingTimers.set(chatId, interval);
  }

  function stopTyping(chatId: number): void {
    const timer = typingTimers.get(chatId);
    if (timer) {
      clearInterval(timer);
      typingTimers.delete(chatId);
    }
  }

  async function sendResponse(chatId: number, text: string): Promise<void> {
    const parts = splitMessage(text);
    for (const part of parts) {
      await sendMessage(chatId, part);
    }
  }

  function isAllowed(chatId: number): boolean {
    if (!allowedChatIds || allowedChatIds.length === 0) return true;
    return allowedChatIds.includes(chatId);
  }

  bot.catch((err) => {
    console.error(`  telegram  error: ${err.message ?? err}`);
  });

  bot.on("message:text", async (ctx) => {
    const chatId = ctx.chat.id;
    const messageId = ctx.message.message_id;
    const text = ctx.message.text;

    if (!isAllowed(chatId)) return;
    if (!text.trim()) return;

    const sessionKey = sessionKeyForChat(chatId);

    // Read receipt: react with 👀 to confirm we've seen the message
    setReaction(chatId, messageId, "👀").catch(() => {});

    startTyping(chatId);
    try {
      const response = await runtime.run(sessionKey, text);
      stopTyping(chatId);
      // Done receipt: swap reaction to ✅
      setReaction(chatId, messageId, "👍").catch(() => {});
      await sendResponse(chatId, response);
    } catch (err) {
      stopTyping(chatId);
      setReaction(chatId, messageId, "👎").catch(() => {});
      const msg = err instanceof Error ? err.message : String(err);
      console.error(`  telegram  run error: ${msg}`);
      await sendMessage(chatId, `Error: ${msg}`).catch(() => {});
    }
  });

  return {
    name: "telegram",

    async start(): Promise<TelegramStartResult> {
      if (running) return { username: connectedUsername ?? "unknown" };
      running = true;

      return new Promise<TelegramStartResult>((resolve) => {
        const timeout = setTimeout(() => {
          resolve({ username: connectedUsername ?? "unknown" });
        }, CONNECTION_TIMEOUT_MS);

        bot
          .start({
            onStart: (info) => {
              clearTimeout(timeout);
              connectedUsername = info.username;
              resolve({ username: info.username });
            },
            allowed_updates: ["message"],
          })
          .catch((err) => {
            clearTimeout(timeout);
            running = false;
            console.error(`  telegram  fatal: ${err instanceof Error ? err.message : err}`);
            resolve({ username: "failed" });
          });
      });
    },

    async stop(): Promise<void> {
      if (!running) return;
      running = false;
      for (const [chatId] of typingTimers) {
        stopTyping(chatId);
      }
      typingTimers = new Map();
      await bot.stop();
    },
  };
}

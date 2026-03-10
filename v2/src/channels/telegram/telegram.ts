import { Bot } from "grammy";
import { getOrCreateSession, listSessions } from "../../core/chat/index.ts";
import { registerChannel, unregisterChannel } from "../../lib/channel_registry.ts";
import type { HandleMessageDeps } from "./handle_message.ts";
import { handleMessage } from "./handle_message.ts";
import { handleReset } from "./handle_reset.ts";
import { handleSkills } from "./handle_skills.ts";
import { handleTrain } from "./handle_train.ts";
import { sessionKeyForChat } from "./session_key.ts";
import type { ReactionEmoji, TelegramChannel, TelegramChannelConfig } from "./types.ts";

const CONNECTION_TIMEOUT_MS = 10_000;
const TELEGRAM_CHANNEL_ID = "telegram";

function recoverChatId(db: Parameters<typeof getOrCreateSession>[0]): number | null {
  const sessions = listSessions(db, { keyPrefix: "telegram:", limit: 1 });
  if (sessions.length === 0) return null;
  const id = Number(sessions[0]!.key.split(":")[1]);
  return Number.isFinite(id) ? id : null;
}

export function createTelegramChannel(config: TelegramChannelConfig): TelegramChannel {
  const { token, db, entity, allowedChatIds } = config;

  const bot = config.bot ?? new Bot(token);
  let running = false;
  let connectedUsername: string | null = null;
  let lastActiveChatId: number | null = allowedChatIds?.[0] ?? recoverChatId(db) ?? null;

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

  function isAllowed(chatId: number): boolean {
    if (!allowedChatIds || allowedChatIds.length === 0) return true;
    return allowedChatIds.includes(chatId);
  }

  function resolveSessionId(chatId: number): number {
    const session = getOrCreateSession(db, sessionKeyForChat(chatId), { purpose: "chat" });
    return session.id;
  }

  const deps: HandleMessageDeps = {
    entity,
    resolveSessionId,
    isAllowed,
    sendMessage,
    sendTyping,
    setReaction,
  };

  bot.catch((err) => {
    const msg = err instanceof Error ? err.message : String(err);
    process.stderr.write(`  telegram  error: ${msg}\n`);
  });

  bot.command("reset", async (ctx) => {
    const chatId = ctx.chat.id;
    await handleReset({ db, isAllowed, sendMessage }, chatId);
  });

  bot.command("skills", async (ctx) => {
    const chatId = ctx.chat.id;
    await handleSkills({ db, isAllowed, sendMessage }, chatId);
  });

  bot.command("train", async (ctx) => {
    const chatId = ctx.chat.id;
    const skillName = ctx.match?.trim() || undefined;
    await handleTrain({ db, isAllowed, sendMessage }, chatId, skillName);
  });

  bot.on("message:text", async (ctx) => {
    const chatId = ctx.chat.id;
    const messageId = ctx.message.message_id;
    const text = ctx.message.text;
    lastActiveChatId = chatId;
    if (text.startsWith("/")) return;
    await handleMessage(deps, chatId, messageId, text);
  });

  return {
    name: "telegram",

    async start(): Promise<{ username: string }> {
      if (running) return { username: connectedUsername ?? "unknown" };
      running = true;

      return new Promise<{ username: string }>((resolve) => {
        const timeout = setTimeout(() => {
          resolve({ username: connectedUsername ?? "unknown" });
        }, CONNECTION_TIMEOUT_MS);

        bot
          .start({
            onStart: (info) => {
              clearTimeout(timeout);
              connectedUsername = info.username;
              registerChannel(TELEGRAM_CHANNEL_ID, {
                type: "telegram",
                isConnected: () => running,
                send: async (message: string) => {
                  const chatId = lastActiveChatId;
                  if (!chatId) throw new Error("No active Telegram chat");
                  await sendMessage(chatId, message);
                },
              });
              resolve({ username: info.username });
            },
            allowed_updates: ["message"],
          })
          .catch((err) => {
            clearTimeout(timeout);
            running = false;
            const msg = err instanceof Error ? err.message : String(err);
            process.stderr.write(`  telegram  fatal: ${msg}\n`);
            resolve({ username: "failed" });
          });
      });
    },

    async stop(): Promise<void> {
      if (!running) return;
      running = false;
      unregisterChannel(TELEGRAM_CHANNEL_ID);
      await bot.stop();
      await entity.flush();
    },
  };
}

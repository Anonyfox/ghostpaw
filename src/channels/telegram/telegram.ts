import { Bot } from "grammy";
import { listSessions, lookupByMessageId } from "../../core/chat/api/read/index.ts";
import { getOrCreateSession } from "../../core/chat/api/write/index.ts";
import { listStoredSecretKeys } from "../../core/secrets/api/read/index.ts";
import { COMMANDS, executeCommand, parseSlashCommand } from "../../harness/commands/registry.ts";
import type { CommandContext } from "../../harness/commands/types.ts";
import { processHowlDismiss } from "../../harness/howl/index.ts";
import { registerChannel, unregisterChannel } from "../../lib/channel_registry.ts";
import { VERSION } from "../../lib/version.ts";
import type { HandleMessageDeps } from "./handle_message.ts";
import { handleMessage } from "./handle_message.ts";
import { renderTelegramHtml } from "./render_telegram.ts";
import { sessionKeyForChat } from "./session_key.ts";
import { splitMessage } from "./split_message.ts";
import type {
  ReactionEmoji,
  TelegramChannel,
  TelegramChannelConfig,
  TelegramSendMessageOptions,
  TelegramSentMessage,
} from "./types.ts";

const CONNECTION_TIMEOUT_MS = 10_000;
const TELEGRAM_CHANNEL_ID = "telegram";
const CONFLICT_RETRY_DELAY_MS = 5_000;
const CONFLICT_MAX_RETRIES = 3;

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
    (async (
      chatId: number,
      text: string,
      options?: TelegramSendMessageOptions,
    ): Promise<TelegramSentMessage> => {
      const replyMarkup = options?.dismissHowlId
        ? {
            inline_keyboard: [
              [{ text: "Dismiss", callback_data: `howl:dismiss:${options.dismissHowlId}` }],
            ],
          }
        : undefined;
      const replyParameters = options?.replyToMessageId
        ? { message_id: options.replyToMessageId }
        : undefined;
      const message = await bot.api.sendMessage(chatId, text, {
        parse_mode: options?.parseMode,
        reply_markup: replyMarkup,
        reply_parameters: replyParameters,
      });
      return { messageId: message.message_id };
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

  const deleteMessages =
    config.deleteMessages ??
    (async (chatId: number, messageIds: number[]) => {
      for (const msgId of messageIds) {
        try {
          await bot.api.deleteMessage(chatId, msgId);
        } catch {
          // Telegram only allows deletion within 48h — silently skip failures
        }
      }
    });

  function isAllowed(chatId: number): boolean {
    if (!allowedChatIds || allowedChatIds.length === 0) return true;
    return allowedChatIds.includes(chatId);
  }

  function resolveSessionId(chatId: number): number {
    const session = getOrCreateSession(db, sessionKeyForChat(chatId), { purpose: "chat" });
    return session.id;
  }

  const sendPlainMessage = async (chatId: number, text: string): Promise<void> => {
    const parts = splitMessage(text);
    for (const part of parts) {
      await sendMessage(chatId, part);
    }
  };

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

  bot.on("message:text", async (ctx) => {
    const chatId = ctx.chat.id;
    const messageId = ctx.message.message_id;
    const text = ctx.message.text;
    const replyToMessageId = ctx.message.reply_to_message?.message_id;
    lastActiveChatId = chatId;

    if (!isAllowed(chatId)) return;

    const parsed = parseSlashCommand(text);
    if (parsed) {
      const sessionId = resolveSessionId(chatId);
      const configuredKeys = new Set(listStoredSecretKeys(db));
      const cmdCtx: CommandContext = {
        db,
        sessionId,
        sessionKey: sessionKeyForChat(chatId),
        configuredKeys,
        workspace: entity.workspace,
        version: VERSION,
      };
      const result = await executeCommand(parsed.name, parsed.args, cmdCtx);

      await sendPlainMessage(chatId, result.text);

      if (result.action?.type === "restart") {
        const { requestRestart } = await import("../../lib/supervisor.ts");
        requestRestart();
        return;
      }

      if (result.action?.type === "undo") {
        const tgIds: number[] = [];
        for (const internalId of result.action.removedMessageIds) {
          const mappings = lookupByMessageId(db, internalId);
          for (const m of mappings) {
            if (m.channel === "telegram") tgIds.push(Number(m.channelMessageId));
          }
        }
        if (tgIds.length > 0) await deleteMessages(chatId, tgIds);
      }
      return;
    }

    await handleMessage(deps, chatId, messageId, text, replyToMessageId);
  });

  bot.callbackQuery(/^howl:dismiss:(\d+)$/, async (ctx) => {
    const chatId = ctx.chat?.id ?? ctx.callbackQuery.message?.chat.id;
    if (!chatId || !isAllowed(chatId)) {
      await ctx.answerCallbackQuery({ text: "Not allowed." });
      return;
    }

    const howlId = Number(ctx.match?.[1]);
    if (!Number.isFinite(howlId)) {
      await ctx.answerCallbackQuery({ text: "Invalid howl." });
      return;
    }

    try {
      await processHowlDismiss(db, howlId);
      await ctx.answerCallbackQuery({ text: "Howl dismissed." });
      await sendPlainMessage(chatId, "Dismissed. The thread is closed.");
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      await ctx.answerCallbackQuery({ text: msg.slice(0, 180) });
    }
  });

  async function registerCommands(): Promise<void> {
    try {
      await bot.api.setMyCommands(
        COMMANDS.map((c) => ({ command: c.name, description: c.description })),
      );
    } catch {
      // Non-fatal — menu registration can fail without blocking the bot
    }
  }

  return {
    name: "telegram",

    async start(): Promise<{ username: string }> {
      if (running) return { username: connectedUsername ?? "unknown" };
      running = true;

      for (let attempt = 0; attempt < CONFLICT_MAX_RETRIES; attempt++) {
        const result = await new Promise<{ username: string; retry: boolean }>((resolve) => {
          const timeout = setTimeout(() => {
            resolve({ username: connectedUsername ?? "unknown", retry: false });
          }, CONNECTION_TIMEOUT_MS);

          bot
            .start({
              onStart: (info) => {
                clearTimeout(timeout);
                connectedUsername = info.username;
                registerCommands();
                registerChannel(TELEGRAM_CHANNEL_ID, {
                  type: "telegram",
                  isConnected: () => running,
                  getHowlCapabilities: () => ({
                    canPush: lastActiveChatId !== null,
                    canInbox: false,
                    explicitReply: true,
                    priority: 100,
                  }),
                  deliverHowl: async ({ howlId, message, originMessageId }) => {
                    const chatId = lastActiveChatId;
                    if (!chatId) throw new Error("No active Telegram chat");

                    let replyToMsgId: number | undefined;
                    if (originMessageId) {
                      const mappings = lookupByMessageId(db, originMessageId);
                      const tgMapping = mappings.find((m) => m.channel === "telegram");
                      if (tgMapping) replyToMsgId = Number(tgMapping.channelMessageId);
                    }

                    const html = renderTelegramHtml(message);
                    const sent = await sendMessage(chatId, html, {
                      parseMode: "HTML",
                      dismissHowlId: howlId,
                      replyToMessageId: replyToMsgId,
                    });
                    return {
                      channel: "telegram" as const,
                      delivered: true,
                      mode: "push" as const,
                      address: String(chatId),
                      messageId: String(sent.messageId),
                    };
                  },
                });
                resolve({ username: info.username, retry: false });
              },
              allowed_updates: ["message", "callback_query"],
            })
            .catch((err) => {
              clearTimeout(timeout);
              running = false;
              const msg = err instanceof Error ? err.message : String(err);
              const isConflict = msg.includes("409") || msg.toLowerCase().includes("conflict");
              if (isConflict && attempt < CONFLICT_MAX_RETRIES - 1) {
                process.stderr.write(
                  `  telegram  conflict, retrying in ${CONFLICT_RETRY_DELAY_MS / 1000}s (${attempt + 1}/${CONFLICT_MAX_RETRIES})\n`,
                );
                resolve({ username: "failed", retry: true });
              } else {
                process.stderr.write(`  telegram  fatal: ${msg}\n`);
                resolve({ username: "failed", retry: false });
              }
            });
        });

        if (!result.retry) return { username: result.username };

        running = true;
        await new Promise((r) => setTimeout(r, CONFLICT_RETRY_DELAY_MS));
      }

      return { username: "failed" };
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

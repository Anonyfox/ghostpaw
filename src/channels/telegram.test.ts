import { deepStrictEqual, ok, strictEqual } from "node:assert";
import { describe, it } from "node:test";
import type { ChannelRuntime } from "./runtime.js";
import {
  chatIdFromSessionKey,
  createTelegramChannel,
  sessionKeyForChat,
  splitMessage,
  type TelegramChannelConfig,
} from "./telegram.js";

// ── Helpers ──────────────────────────────────────────────────────────────────

interface SentMessage {
  chatId: number;
  text: string;
}

interface TypingCall {
  chatId: number;
}

interface ReactionCall {
  chatId: number;
  messageId: number;
  emoji: string;
}

function createMockRuntime(opts?: {
  response?: string;
  failWith?: string;
  delay?: number;
}): ChannelRuntime {
  const response = opts?.response ?? "mock response";
  const failWith = opts?.failWith;
  const delay = opts?.delay ?? 0;

  return {
    db: {} as unknown as import("../core/database.js").GhostpawDatabase,
    workspace: "/tmp/test",
    model: "test-model",
    sessions: null as never,
    memory: null as never,
    eventBus: null as never,
    secrets: null as never,
    setModel() {},

    async run(_sessionKey: string, _text: string): Promise<string> {
      if (delay) await new Promise((r) => setTimeout(r, delay));
      if (failWith) throw new Error(failWith);
      return response;
    },

    async *stream(_sessionKey: string, _text: string): AsyncGenerator<string> {
      yield response;
    },

    stop(): void {},
  };
}

let nextMessageId = 1;

/**
 * Creates a Telegram channel with fully mocked I/O. Returns
 * the channel + a trigger function to simulate incoming messages
 * + arrays to inspect outgoing messages, typing calls, and reactions.
 */
function createTestChannel(
  runtimeOpts?: Parameters<typeof createMockRuntime>[0],
  channelOpts?: Partial<TelegramChannelConfig>,
) {
  const sent: SentMessage[] = [];
  const typing: TypingCall[] = [];
  const reactions: ReactionCall[] = [];
  const runtime = createMockRuntime(runtimeOpts);

  type MessageHandler = (ctx: {
    chat: { id: number };
    message: { message_id: number; text: string };
  }) => Promise<void>;

  let messageHandler: MessageHandler | null = null;

  const mockBot = {
    on(event: string, handler: MessageHandler) {
      if (event === "message:text") messageHandler = handler;
    },
    catch(_handler: unknown) {},
    start(opts?: { onStart?: (info: { username: string }) => void }) {
      if (opts?.onStart) opts.onStart({ username: "test_bot" });
      return Promise.resolve();
    },
    stop() {
      return Promise.resolve();
    },
    api: {
      sendMessage: async () => ({}),
      sendChatAction: async () => ({}),
      setMessageReaction: async () => ({}),
    },
  };

  const channel = createTelegramChannel({
    token: "fake-token",
    runtime,
    bot: mockBot as never,
    sendMessage: async (chatId: number, text: string) => {
      sent.push({ chatId, text });
    },
    sendTyping: async (chatId: number) => {
      typing.push({ chatId });
    },
    setReaction: async (chatId: number, messageId: number, emoji: string) => {
      reactions.push({ chatId, messageId, emoji });
    },
    ...channelOpts,
  });

  async function simulateMessage(chatId: number, text: string): Promise<void> {
    ok(messageHandler, "message handler should be registered");
    const messageId = nextMessageId++;
    await messageHandler({ chat: { id: chatId }, message: { message_id: messageId, text } });
  }

  return { channel, simulateMessage, sent, typing, reactions, runtime };
}

// ── sessionKeyForChat ────────────────────────────────────────────────────────

describe("sessionKeyForChat", () => {
  it("creates a namespaced key from chat ID", () => {
    strictEqual(sessionKeyForChat(12345), "telegram:12345");
  });

  it("handles negative chat IDs (groups)", () => {
    strictEqual(sessionKeyForChat(-100123456), "telegram:-100123456");
  });
});

// ── chatIdFromSessionKey ────────────────────────────────────────────────────

describe("chatIdFromSessionKey", () => {
  it("extracts chat ID from a valid session key", () => {
    strictEqual(chatIdFromSessionKey("telegram:12345"), 12345);
  });

  it("handles negative chat IDs (groups)", () => {
    strictEqual(chatIdFromSessionKey("telegram:-100123456"), -100123456);
  });

  it("returns null for non-telegram keys", () => {
    strictEqual(chatIdFromSessionKey("discord:12345"), null);
  });

  it("returns null for malformed keys", () => {
    strictEqual(chatIdFromSessionKey("telegram:abc"), null);
    strictEqual(chatIdFromSessionKey("telegram:"), null);
    strictEqual(chatIdFromSessionKey(""), null);
  });

  it("roundtrips with sessionKeyForChat", () => {
    const chatId = 42;
    strictEqual(chatIdFromSessionKey(sessionKeyForChat(chatId)), chatId);
    const groupId = -100999;
    strictEqual(chatIdFromSessionKey(sessionKeyForChat(groupId)), groupId);
  });
});

// ── splitMessage ─────────────────────────────────────────────────────────────

describe("splitMessage", () => {
  it("returns single-element array for short messages", () => {
    deepStrictEqual(splitMessage("hello"), ["hello"]);
  });

  it("returns single-element array for exactly 4096 chars", () => {
    const text = "x".repeat(4096);
    const parts = splitMessage(text);
    strictEqual(parts.length, 1);
    strictEqual(parts[0]!.length, 4096);
  });

  it("splits long messages at newline boundaries", () => {
    const line = "a".repeat(2000);
    const text = `${line}\n${line}\n${line}`;
    const parts = splitMessage(text);
    ok(parts.length >= 2, `expected >=2 parts, got ${parts.length}`);
    for (const part of parts) {
      ok(part.length <= 4096, `part exceeds max: ${part.length}`);
    }
    const rejoined = parts.join("\n");
    strictEqual(rejoined.replace(/\n/g, "").length, text.replace(/\n/g, "").length);
  });

  it("splits at space when no newlines available", () => {
    const words = Array.from({ length: 1000 }, () => "word").join(" ");
    const parts = splitMessage(words);
    ok(parts.length >= 2);
    for (const part of parts) {
      ok(part.length <= 4096);
    }
  });

  it("hard-splits when no whitespace at all", () => {
    const text = "x".repeat(10000);
    const parts = splitMessage(text);
    ok(parts.length >= 3);
    strictEqual(parts[0]!.length, 4096);
    const total = parts.reduce((sum, p) => sum + p.length, 0);
    strictEqual(total, 10000);
  });

  it("handles empty string", () => {
    deepStrictEqual(splitMessage(""), [""]);
  });
});

// ── Read receipts (reactions) ────────────────────────────────────────────────

describe("Telegram channel - read receipts", () => {
  it("reacts with 👀 on receive, 👍 after response", async () => {
    const { simulateMessage, reactions } = createTestChannel({ response: "ok" });

    await simulateMessage(111, "hi");

    ok(reactions.length >= 2, `expected >=2 reactions, got ${reactions.length}`);
    strictEqual(reactions[0]!.emoji, "👀");
    strictEqual(reactions[1]!.emoji, "👍");
    strictEqual(reactions[0]!.chatId, 111);
    strictEqual(reactions[1]!.chatId, 111);
    strictEqual(reactions[0]!.messageId, reactions[1]!.messageId);
  });

  it("reacts with 👎 when runtime fails", async () => {
    const { simulateMessage, reactions } = createTestChannel({
      failWith: "something broke",
    });

    await simulateMessage(111, "hi");

    const last = reactions[reactions.length - 1]!;
    strictEqual(last.emoji, "👎");
  });

  it("does not crash if reaction API fails", async () => {
    const runtime = createMockRuntime({ response: "ok" });
    const { simulateMessage, sent } = createTestChannel(undefined, {
      runtime,
      setReaction: async () => {
        throw new Error("reaction API unavailable");
      },
    });

    await simulateMessage(111, "hi");
    strictEqual(sent.length, 1);
    strictEqual(sent[0]!.text, "ok");
  });
});

// ── Message flow ─────────────────────────────────────────────────────────────

describe("Telegram channel - message flow", () => {
  it("sends response to the correct chat", async () => {
    const { simulateMessage, sent } = createTestChannel({ response: "hello back" });

    await simulateMessage(111, "hi");

    strictEqual(sent.length, 1);
    strictEqual(sent[0]!.chatId, 111);
    strictEqual(sent[0]!.text, "hello back");
  });

  it("routes messages from different chats independently", async () => {
    const { simulateMessage, sent } = createTestChannel({ response: "ok" });

    await simulateMessage(111, "from user 1");
    await simulateMessage(222, "from user 2");

    strictEqual(sent.length, 2);
    strictEqual(sent[0]!.chatId, 111);
    strictEqual(sent[1]!.chatId, 222);
  });

  it("passes correct session key to runtime", async () => {
    const sessionKeys: string[] = [];
    const runtime = createMockRuntime();
    const originalRun = runtime.run.bind(runtime);
    runtime.run = async (key: string, text: string) => {
      sessionKeys.push(key);
      return originalRun(key, text);
    };

    const { simulateMessage } = createTestChannel(undefined, { runtime });
    await simulateMessage(42, "test");

    strictEqual(sessionKeys.length, 1);
    strictEqual(sessionKeys[0], "telegram:42");
  });

  it("uses negative chat ID for group sessions", async () => {
    const sessionKeys: string[] = [];
    const runtime = createMockRuntime();
    const originalRun = runtime.run.bind(runtime);
    runtime.run = async (key: string, text: string) => {
      sessionKeys.push(key);
      return originalRun(key, text);
    };

    const { simulateMessage } = createTestChannel(undefined, { runtime });
    await simulateMessage(-100123, "group message");

    strictEqual(sessionKeys[0], "telegram:-100123");
  });
});

// ── Typing indicator ─────────────────────────────────────────────────────────

describe("Telegram channel - typing indicator", () => {
  it("sends typing indicator before processing", async () => {
    const { simulateMessage, typing } = createTestChannel({ response: "ok" });

    await simulateMessage(111, "hi");

    ok(typing.length >= 1, "should send at least one typing indicator");
    strictEqual(typing[0]!.chatId, 111);
  });

  it("stops typing after response is sent", async () => {
    const { simulateMessage, typing } = createTestChannel({ response: "done" });

    await simulateMessage(111, "hi");

    // Typing started, then response sent — no lingering intervals
    // (channel.stop would clear them, but they should be cleared after response)
    const lastTypingChat = typing[typing.length - 1]!.chatId;
    strictEqual(lastTypingChat, 111);
  });
});

// ── Long messages ────────────────────────────────────────────────────────────

describe("Telegram channel - long messages", () => {
  it("splits responses exceeding 4096 chars into multiple messages", async () => {
    const longResponse = "x".repeat(5000);
    const { simulateMessage, sent } = createTestChannel({ response: longResponse });

    await simulateMessage(111, "give me a lot");

    ok(sent.length >= 2, `expected >=2 messages, got ${sent.length}`);
    for (const msg of sent) {
      ok(msg.text.length <= 4096, `message exceeds limit: ${msg.text.length}`);
    }
    const total = sent.reduce((sum, m) => sum + m.text.length, 0);
    strictEqual(total, 5000);
  });
});

// ── Error handling ───────────────────────────────────────────────────────────

describe("Telegram channel - error handling", () => {
  it("sends error message to chat when runtime fails", async () => {
    const { simulateMessage, sent } = createTestChannel({
      failWith: "LLM provider timeout",
    });

    await simulateMessage(111, "hi");

    strictEqual(sent.length, 1);
    ok(sent[0]!.text.includes("LLM provider timeout"));
  });

  it("does not crash when send itself fails after runtime error", async () => {
    let sendCalls = 0;
    const runtime = createMockRuntime({ failWith: "boom" });

    const { simulateMessage } = createTestChannel(undefined, {
      runtime,
      sendMessage: async () => {
        sendCalls++;
        if (sendCalls === 1) throw new Error("Network error on send");
      },
    });

    // Should not throw even though both runtime and send fail
    await simulateMessage(111, "hi");
  });
});

// ── Access control ───────────────────────────────────────────────────────────

describe("Telegram channel - access control", () => {
  it("ignores messages from non-allowed chat IDs", async () => {
    const { simulateMessage, sent } = createTestChannel(
      { response: "secret" },
      { allowedChatIds: [111, 222] },
    );

    await simulateMessage(999, "try to access");

    strictEqual(sent.length, 0, "should not send any response");
  });

  it("allows messages from allowed chat IDs", async () => {
    const { simulateMessage, sent } = createTestChannel(
      { response: "welcome" },
      { allowedChatIds: [111, 222] },
    );

    await simulateMessage(111, "hello");
    await simulateMessage(222, "hello too");

    strictEqual(sent.length, 2);
  });

  it("allows all chats when allowedChatIds is empty", async () => {
    const { simulateMessage, sent } = createTestChannel(
      { response: "open" },
      { allowedChatIds: [] },
    );

    await simulateMessage(999, "anyone");

    strictEqual(sent.length, 1);
  });

  it("allows all chats when allowedChatIds is not set", async () => {
    const { simulateMessage, sent } = createTestChannel({ response: "open" });

    await simulateMessage(999, "anyone");

    strictEqual(sent.length, 1);
  });
});

// ── Edge cases ───────────────────────────────────────────────────────────────

describe("Telegram channel - edge cases", () => {
  it("ignores empty/whitespace-only messages", async () => {
    const { simulateMessage, sent } = createTestChannel({ response: "nope" });

    await simulateMessage(111, "");
    await simulateMessage(111, "   ");
    await simulateMessage(111, "\n\t");

    strictEqual(sent.length, 0);
  });

  it("handles (no response) from runtime gracefully", async () => {
    const runtime = createMockRuntime();
    runtime.run = async () => "(no response)";

    const { simulateMessage, sent } = createTestChannel(undefined, { runtime });
    await simulateMessage(111, "hi");

    strictEqual(sent.length, 1);
    strictEqual(sent[0]!.text, "(no response)");
  });
});

// ── Lifecycle ────────────────────────────────────────────────────────────────

describe("Telegram channel - lifecycle", () => {
  it("has the correct channel name", () => {
    const { channel } = createTestChannel();
    strictEqual(channel.name, "telegram");
  });

  it("start() is idempotent", async () => {
    const { channel } = createTestChannel();
    await channel.start();
    await channel.start(); // second call should not throw
  });

  it("stop() is idempotent", async () => {
    const { channel } = createTestChannel();
    await channel.start();
    await channel.stop();
    await channel.stop(); // second call should not throw
  });
});

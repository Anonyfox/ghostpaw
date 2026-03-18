import { deepStrictEqual, ok, strictEqual } from "node:assert";
import { afterEach, beforeEach, describe, it } from "node:test";
import { createHowl, updateHowlDelivery } from "../../core/chat/api/write/howls/index.ts";
import { addMessage, createSession, type TurnResult } from "../../core/chat/api/write/index.ts";
import { initChatTables, initHowlTables } from "../../core/chat/runtime/index.ts";
import type { Entity } from "../../harness/index.ts";
import type { DatabaseHandle } from "../../lib/index.ts";
import { openTestDatabase } from "../../lib/index.ts";
import type { HandleMessageDeps } from "./handle_message.ts";
import { handleMessage } from "./handle_message.ts";
import type { ReactionEmoji, TelegramSentMessage } from "./types.ts";

function makeTurnOk(sessionId: number, db: DatabaseHandle): TurnResult {
  const userMsg = addMessage(db, { sessionId, role: "user", content: "stub" });
  const assistMsg = addMessage(db, {
    sessionId,
    role: "assistant",
    content: "Hello from Ghostpaw!",
    parentId: userMsg.id,
  });
  return {
    succeeded: true,
    messageId: assistMsg.id,
    userMessageId: userMsg.id,
    content: "Hello from Ghostpaw!",
    model: "test-model",
    usage: {
      inputTokens: 10,
      outputTokens: 20,
      reasoningTokens: 0,
      cachedTokens: 0,
      totalTokens: 30,
    },
    cost: { estimatedUsd: 0.001 },
    iterations: 1,
  };
}

let sharedDb: DatabaseHandle;

beforeEach(async () => {
  sharedDb = await openTestDatabase();
  initChatTables(sharedDb);
  initHowlTables(sharedDb);
});

afterEach(() => {
  sharedDb.close();
});

function stubEntity(executeTurn: Entity["executeTurn"], db?: DatabaseHandle): Entity {
  const d = db ?? sharedDb;
  return {
    db: d,
    workspace: "/tmp",
    executeTurn,
    async *streamTurn() {
      yield "";
      const s = createSession(d, `tg:stream:${Date.now()}`);
      return makeTurnOk(s.id as number, d);
    },
    async flush() {},
  };
}

function createMockDeps(overrides?: Partial<HandleMessageDeps>): HandleMessageDeps & {
  sent: Array<{ chatId: number; text: string }>;
  typings: number[];
  reactions: Array<{ chatId: number; messageId: number; emoji: ReactionEmoji }>;
} {
  const sent: Array<{ chatId: number; text: string }> = [];
  const typings: number[] = [];
  const reactions: Array<{ chatId: number; messageId: number; emoji: ReactionEmoji }> = [];

  const defaultSession = createSession(sharedDb, `tg:test:${Date.now()}`);
  const defaultTurn = makeTurnOk(defaultSession.id as number, sharedDb);

  return {
    resolveSessionId: () => defaultSession.id as number,
    entity: stubEntity(async () => defaultTurn),
    isAllowed: () => true,
    sendMessage: async (chatId, text): Promise<TelegramSentMessage> => {
      sent.push({ chatId, text });
      return { messageId: sent.length };
    },
    sendTyping: async (chatId) => {
      typings.push(chatId);
    },
    setReaction: async (chatId, messageId, emoji) => {
      reactions.push({ chatId, messageId, emoji });
    },
    sent,
    typings,
    reactions,
    ...overrides,
  };
}

describe("handleMessage", () => {
  it("silently drops messages from disallowed chats", async () => {
    const deps = createMockDeps({ isAllowed: () => false });
    await handleMessage(deps, 123, 1, "hello");
    strictEqual(deps.sent.length, 0);
    strictEqual(deps.reactions.length, 0);
  });

  it("silently drops empty/whitespace messages", async () => {
    const deps = createMockDeps();
    await handleMessage(deps, 123, 1, "   ");
    strictEqual(deps.sent.length, 0);
    strictEqual(deps.reactions.length, 0);
  });

  it("sends eyes reaction, then thumbs-up on success", async () => {
    const deps = createMockDeps();
    await handleMessage(deps, 42, 7, "hi");
    strictEqual(deps.reactions.length, 2);
    deepStrictEqual(deps.reactions[0], { chatId: 42, messageId: 7, emoji: "\u{1F440}" });
    deepStrictEqual(deps.reactions[1], { chatId: 42, messageId: 7, emoji: "\u{1F44D}" });
  });

  it("sends typing indicator before processing", async () => {
    const deps = createMockDeps();
    await handleMessage(deps, 42, 7, "hi");
    ok(deps.typings.length >= 1);
    strictEqual(deps.typings[0], 42);
  });

  it("sends the response text", async () => {
    const deps = createMockDeps();
    await handleMessage(deps, 42, 7, "hi");
    strictEqual(deps.sent.length, 1);
    strictEqual(deps.sent[0]!.chatId, 42);
    strictEqual(deps.sent[0]!.text, "Hello from Ghostpaw!");
  });

  it("splits long responses into multiple messages", async () => {
    const longContent = "x".repeat(5000);
    const longSession = createSession(sharedDb, `tg:long:${Date.now()}`);
    const longTurn = makeTurnOk(longSession.id as number, sharedDb);
    const deps = createMockDeps({
      resolveSessionId: () => longSession.id as number,
      entity: stubEntity(async () => ({ ...longTurn, content: longContent })),
    });
    await handleMessage(deps, 42, 7, "tell me a lot");
    ok(deps.sent.length >= 2, `expected >=2 messages, got ${deps.sent.length}`);
    for (const msg of deps.sent) {
      ok(msg.text.length <= 4096);
    }
  });

  it("reacts thumbs-down and sends error text on failure", async () => {
    const deps = createMockDeps({
      entity: stubEntity(async () => {
        throw new Error("LLM exploded");
      }),
    });
    await handleMessage(deps, 42, 7, "hi");
    const thumbsDown = deps.reactions.find((r) => r.emoji === "\u{1F44E}");
    ok(thumbsDown, "expected thumbs-down reaction");
    const errorMsg = deps.sent.find((s) => s.text.includes("LLM exploded"));
    ok(errorMsg, "expected error message to be sent");
  });

  it("allows all chats when isAllowed returns true", async () => {
    const deps = createMockDeps({ isAllowed: () => true });
    await handleMessage(deps, 999, 1, "hello");
    ok(deps.sent.length > 0);
  });

  it("keeps plain text as direct chat when telegram howl fallback is ambiguous", async () => {
    const origin = createSession(sharedDb, "chat:origin");
    const howlA = createHowl(sharedDb, {
      originSessionId: origin.id as number,
      message: "A?",
      urgency: "low",
    });
    const howlB = createHowl(sharedDb, {
      originSessionId: origin.id as number,
      message: "B?",
      urgency: "low",
    });
    updateHowlDelivery(sharedDb, howlA.id, {
      channel: "telegram",
      deliveryAddress: "77",
      deliveryMessageId: "10",
      deliveryMode: "push",
    });
    updateHowlDelivery(sharedDb, howlB.id, {
      channel: "telegram",
      deliveryAddress: "77",
      deliveryMessageId: "11",
      deliveryMode: "push",
    });

    const deps = createMockDeps();
    await handleMessage(deps, 77, 12, "normal chat");

    strictEqual(deps.sent[0]?.text, "Hello from Ghostpaw!");
  });
});

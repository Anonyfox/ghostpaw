import { deepStrictEqual, ok, strictEqual } from "node:assert";
import { describe, it } from "node:test";
import type { TurnResult } from "../../core/chat/index.ts";
import { createSession, getSession, initChatTables } from "../../core/chat/index.ts";
import type { Entity } from "../../harness/index.ts";
import type { DatabaseHandle } from "../../lib/index.ts";
import { openTestDatabase, TokenBudgetError } from "../../lib/index.ts";
import type { HandleMessageDeps } from "./handle_message.ts";
import { handleMessage } from "./handle_message.ts";
import type { ReactionEmoji } from "./types.ts";

const TURN_OK: TurnResult = {
  succeeded: true,
  messageId: 1,
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

function stubEntity(executeTurn: Entity["executeTurn"], db?: DatabaseHandle): Entity {
  return {
    db: db ?? ({} as never),
    workspace: "/tmp",
    executeTurn,
    async *streamTurn() {
      yield "";
      return { ...TURN_OK, content: "" };
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

  return {
    resolveSessionId: () => 1,
    entity: stubEntity(async () => TURN_OK),
    isAllowed: () => true,
    sendMessage: async (chatId, text) => {
      sent.push({ chatId, text });
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
    const deps = createMockDeps({
      entity: stubEntity(async () => ({ ...TURN_OK, content: longContent })),
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
});

describe("handleMessage — session rotation", () => {
  it("rotates transparently when session token budget is exhausted", async () => {
    const db = await openTestDatabase();
    initChatTables(db);
    const session = createSession(db, "telegram:42", { purpose: "chat" });

    let callCount = 0;
    const deps = createMockDeps({
      resolveSessionId: () => session.id,
      entity: stubEntity(async () => {
        callCount++;
        if (callCount === 1) {
          throw new TokenBudgetError("session", 200_001, 200_000);
        }
        return { ...TURN_OK, content: "Seamless reply after rotation" };
      }, db),
    });

    await handleMessage(deps, 42, 7, "hi");

    strictEqual(callCount, 2, "executeTurn should be called twice (original + retry)");
    ok(deps.sent.some((s) => s.text === "Seamless reply after rotation"));

    const oldSession = getSession(db, session.id);
    ok(oldSession?.closedAt, "old session should be closed after rotation");

    const thumbsUp = deps.reactions.find((r) => r.emoji === "\u{1F44D}");
    ok(thumbsUp, "user should see thumbs-up, not an error");

    db.close();
  });

  it("does not rotate on daily token budget errors", async () => {
    const deps = createMockDeps({
      entity: stubEntity(async () => {
        throw new TokenBudgetError("day", 1_000_001, 1_000_000);
      }),
    });

    await handleMessage(deps, 42, 7, "hi");

    const errorMsg = deps.sent.find((s) => s.text.includes("Daily token limit"));
    ok(errorMsg, "daily limit error should be shown to the user");
    const thumbsDown = deps.reactions.find((r) => r.emoji === "\u{1F44E}");
    ok(thumbsDown, "thumbs-down on daily limit");
  });

  it("shows error when retry after rotation also fails", async () => {
    const db = await openTestDatabase();
    initChatTables(db);
    const session = createSession(db, "telegram:42", { purpose: "chat" });

    const deps = createMockDeps({
      resolveSessionId: () => session.id,
      entity: stubEntity(async () => {
        throw new TokenBudgetError("session", 200_001, 200_000);
      }, db),
    });

    await handleMessage(deps, 42, 7, "hi");

    const errorMsg = deps.sent.find((s) => s.text.includes("Error:"));
    ok(errorMsg, "error should surface to user when retry also fails");
    const thumbsDown = deps.reactions.find((r) => r.emoji === "\u{1F44E}");
    ok(thumbsDown, "thumbs-down when everything fails");

    db.close();
  });

  it("propagates non-budget errors without attempting rotation", async () => {
    const deps = createMockDeps({
      entity: stubEntity(async () => {
        throw new Error("network timeout");
      }),
    });

    await handleMessage(deps, 42, 7, "hi");

    const errorMsg = deps.sent.find((s) => s.text.includes("network timeout"));
    ok(errorMsg, "non-budget errors should pass through unchanged");
  });
});

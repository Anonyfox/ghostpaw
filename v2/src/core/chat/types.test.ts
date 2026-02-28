import { deepStrictEqual, ok, strictEqual } from "node:assert";
import { describe, it } from "node:test";
import type {
  AddMessageInput,
  ChatMessage,
  ChatSession,
  CreateSessionInput,
  ListSessionsFilter,
  MessageRole,
  SessionPurpose,
  TurnInput,
  TurnResult,
} from "./types.ts";
import { MESSAGE_ROLES, SESSION_PURPOSES } from "./types.ts";

describe("SESSION_PURPOSES", () => {
  it("contains all six purpose values", () => {
    deepStrictEqual(SESSION_PURPOSES, ["chat", "delegate", "train", "scout", "refine", "system"]);
  });

  it("every element is unique", () => {
    strictEqual(new Set(SESSION_PURPOSES).size, SESSION_PURPOSES.length);
  });
});

describe("MESSAGE_ROLES", () => {
  it("contains user and assistant", () => {
    deepStrictEqual(MESSAGE_ROLES, ["user", "assistant"]);
  });

  it("every element is unique", () => {
    strictEqual(new Set(MESSAGE_ROLES).size, MESSAGE_ROLES.length);
  });
});

describe("type compatibility", () => {
  it("SessionPurpose elements are assignable to the union", () => {
    const p: SessionPurpose = SESSION_PURPOSES[0]!;
    ok(typeof p === "string");
  });

  it("MessageRole elements are assignable to the union", () => {
    const r: MessageRole = MESSAGE_ROLES[0]!;
    ok(typeof r === "string");
  });

  it("ChatSession has all required fields", () => {
    const session: ChatSession = {
      id: 1,
      key: "telegram:123",
      purpose: "chat",
      model: "claude-sonnet-4-20250514",
      displayName: null,
      createdAt: Date.now(),
      lastActiveAt: Date.now(),
      tokensIn: 0,
      tokensOut: 0,
      costUsd: 0,
      headMessageId: null,
      closedAt: null,
      absorbedAt: null,
    };
    strictEqual(session.key, "telegram:123");
    strictEqual(session.headMessageId, null);
    strictEqual(session.displayName, null);
  });

  it("ChatSession nullable fields accept numbers", () => {
    const session: ChatSession = {
      id: 2,
      key: "web:abc",
      purpose: "delegate",
      model: null,
      displayName: "My Chat",
      createdAt: Date.now(),
      lastActiveAt: Date.now(),
      tokensIn: 100,
      tokensOut: 50,
      costUsd: 0.01,
      headMessageId: 5,
      closedAt: Date.now(),
      absorbedAt: Date.now(),
    };
    ok(session.headMessageId !== null);
    ok(session.closedAt !== null);
    ok(session.absorbedAt !== null);
    strictEqual(session.displayName, "My Chat");
  });

  it("ChatMessage has all required fields", () => {
    const msg: ChatMessage = {
      id: 1,
      sessionId: 1,
      parentId: null,
      role: "user",
      content: "hello",
      model: null,
      tokensIn: 0,
      tokensOut: 0,
      costUsd: 0,
      createdAt: Date.now(),
      isCompaction: false,
    };
    strictEqual(msg.role, "user");
    strictEqual(msg.isCompaction, false);
  });

  it("ChatMessage supports compaction flag", () => {
    const msg: ChatMessage = {
      id: 2,
      sessionId: 1,
      parentId: 1,
      role: "assistant",
      content: "summary of conversation",
      model: "gpt-4o",
      tokensIn: 500,
      tokensOut: 200,
      costUsd: 0.003,
      createdAt: Date.now(),
      isCompaction: true,
    };
    strictEqual(msg.isCompaction, true);
    ok(msg.model !== null);
  });

  it("CreateSessionInput fields are all optional", () => {
    const empty: CreateSessionInput = {};
    strictEqual(empty.purpose, undefined);
    strictEqual(empty.model, undefined);
  });

  it("AddMessageInput requires sessionId, role, and content", () => {
    const input: AddMessageInput = {
      sessionId: 1,
      role: "user",
      content: "test message",
    };
    strictEqual(input.sessionId, 1);
    strictEqual(input.tokensIn, undefined);
  });

  it("ListSessionsFilter fields are all optional", () => {
    const empty: ListSessionsFilter = {};
    strictEqual(empty.purpose, undefined);
    strictEqual(empty.open, undefined);
    strictEqual(empty.absorbed, undefined);
  });

  it("TurnInput requires sessionId, content, systemPrompt, and model", () => {
    const input: TurnInput = {
      sessionId: 1,
      content: "hello",
      systemPrompt: "You are a helpful assistant.",
      model: "claude-sonnet-4-20250514",
    };
    strictEqual(input.maxIterations, undefined);
    strictEqual(input.compactionThreshold, undefined);
  });

  it("TurnInput accepts all optional generation parameters", () => {
    const input: TurnInput = {
      sessionId: 1,
      content: "hello",
      systemPrompt: "system",
      model: "gpt-4o",
      maxIterations: 10,
      toolTimeout: 30_000,
      temperature: 0.7,
      maxTokens: 4096,
      reasoning: "medium",
      compactionThreshold: 100_000,
    };
    strictEqual(input.reasoning, "medium");
    strictEqual(input.temperature, 0.7);
  });

  it("TurnResult has all required fields", () => {
    const result: TurnResult = {
      messageId: 42,
      content: "response text",
      model: "claude-sonnet-4-20250514",
      usage: {
        inputTokens: 1000,
        outputTokens: 500,
        reasoningTokens: 0,
        totalTokens: 1500,
      },
      cost: { estimatedUsd: 0.015 },
      iterations: 3,
    };
    strictEqual(result.usage.totalTokens, 1500);
    strictEqual(result.iterations, 3);
  });
});

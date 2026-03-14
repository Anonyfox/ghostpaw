import { ok, strictEqual } from "node:assert";
import { afterEach, beforeEach, describe, it } from "node:test";
import type { DatabaseHandle } from "../../lib/index.ts";
import { openTestDatabase } from "../../lib/index.ts";
import { addMessage } from "./add_message.ts";
import { createSession } from "./create_session.ts";
import { getSession } from "./get_session.ts";
import { recordTurn } from "./record_turn.ts";
import { initChatTables } from "./schema.ts";

let db: DatabaseHandle;

beforeEach(async () => {
  db = await openTestDatabase();
  initChatTables(db);
});

afterEach(() => {
  db.close();
});

describe("recordTurn", () => {
  it("stores an assistant message and returns TurnResult", () => {
    const session = createSession(db, "k");
    const userMsg = addMessage(db, { sessionId: session.id, role: "user", content: "hello" });
    const result = recordTurn(
      db,
      session.id,
      "Hi there!",
      {
        usage: {
          inputTokens: 100,
          outputTokens: 50,
          reasoningTokens: 10,
          cachedTokens: 0,
          totalTokens: 150,
        },
        cost: { estimatedUsd: 0.005 },
        model: "gpt-4o",
        iterations: 2,
      },
      "gpt-4o",
      userMsg.id,
    );
    ok(result.messageId > 0);
    strictEqual(result.content, "Hi there!");
    strictEqual(result.model, "gpt-4o");
    strictEqual(result.usage.inputTokens, 100);
    strictEqual(result.usage.outputTokens, 50);
    strictEqual(result.usage.reasoningTokens, 10);
    strictEqual(result.usage.totalTokens, 150);
    strictEqual(result.cost.estimatedUsd, 0.005);
    strictEqual(result.iterations, 2);
  });

  it("updates session token totals", () => {
    const session = createSession(db, "k");
    recordTurn(
      db,
      session.id,
      "response",
      {
        usage: {
          inputTokens: 200,
          outputTokens: 100,
          reasoningTokens: 0,
          cachedTokens: 0,
          totalTokens: 300,
        },
        cost: { estimatedUsd: 0.01 },
        model: "gpt-4o",
        iterations: 1,
      },
      "gpt-4o",
      null,
    );
    const updated = getSession(db, session.id);
    ok(updated);
    strictEqual(updated.tokensIn, 200);
    strictEqual(updated.tokensOut, 100);
    strictEqual(updated.costUsd, 0.01);
  });

  it("accumulates tokens across multiple turns", () => {
    const session = createSession(db, "k");
    const lastResult = {
      usage: {
        inputTokens: 100,
        outputTokens: 50,
        reasoningTokens: 0,
        cachedTokens: 0,
        totalTokens: 150,
      },
      cost: { estimatedUsd: 0.005 },
      model: "gpt-4o",
      iterations: 1,
    };
    recordTurn(db, session.id, "r1", lastResult, "gpt-4o", null);
    recordTurn(db, session.id, "r2", lastResult, "gpt-4o", null);
    const updated = getSession(db, session.id);
    ok(updated);
    strictEqual(updated.tokensIn, 200);
    strictEqual(updated.tokensOut, 100);
    strictEqual(updated.costUsd, 0.01);
  });

  it("uses the model from lastResult when available", () => {
    const session = createSession(db, "k");
    const result = recordTurn(
      db,
      session.id,
      "response",
      {
        usage: {
          inputTokens: 10,
          outputTokens: 5,
          reasoningTokens: 0,
          cachedTokens: 0,
          totalTokens: 15,
        },
        cost: { estimatedUsd: 0 },
        model: "claude-sonnet-4-20250514",
        iterations: 1,
      },
      "gpt-4o",
      null,
    );
    strictEqual(result.model, "claude-sonnet-4-20250514");
  });

  it("falls back to estimates when lastResult is null", () => {
    const session = createSession(db, "k");
    const result = recordTurn(db, session.id, "short response", null, "gpt-4o", null);
    ok(result.usage.inputTokens > 0);
    ok(result.usage.outputTokens > 0);
    strictEqual(result.model, "gpt-4o");
    strictEqual(result.iterations, 1);
  });

  it("updates session head_message_id to the new message", () => {
    const session = createSession(db, "k");
    const result = recordTurn(db, session.id, "response", null, "gpt-4o", null);
    const updated = getSession(db, session.id);
    ok(updated);
    strictEqual(updated.headMessageId, result.messageId);
  });

  it("keeps failed turns at zero authoritative usage when provider usage is missing", () => {
    const session = createSession(db, "k");
    const result = recordTurn(db, session.id, "Error: failed", null, "gpt-4o", null, false);

    strictEqual(result.succeeded, false);
    strictEqual(result.usage.inputTokens, 0);
    strictEqual(result.usage.outputTokens, 0);
    strictEqual(result.cost.estimatedUsd, 0);

    const updated = getSession(db, session.id);
    ok(updated);
    strictEqual(updated.tokensIn, 0);
    strictEqual(updated.tokensOut, 0);
    strictEqual(updated.costUsd, 0);
  });
});

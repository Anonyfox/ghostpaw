import { ok, strictEqual } from "node:assert/strict";
import { afterEach, beforeEach, describe, it } from "node:test";
import { getSession, listSessions } from "../../core/chat/api/read/index.ts";
import {
  type ChatInstance,
  createSession,
  renameSession,
} from "../../core/chat/api/write/index.ts";
import { initChatTables } from "../../core/chat/runtime/index.ts";
import type { DatabaseHandle } from "../../lib/index.ts";
import { openTestDatabase } from "../../lib/index.ts";
import { generateSessionTitle } from "./generate_title.ts";

function mockFactory(response: string) {
  return (_model: string): ChatInstance => ({
    system() {
      return this;
    },
    user() {
      return this;
    },
    assistant() {
      return this;
    },
    addTool() {
      return this;
    },
    get messages() {
      return [];
    },
    async generate() {
      return response;
    },
    async *stream() {
      yield response;
    },
    get lastResult() {
      return {
        usage: {
          inputTokens: 20,
          outputTokens: 10,
          reasoningTokens: 0,
          totalTokens: 30,
          cachedTokens: 0,
        },
        cost: { estimatedUsd: 0.0001 },
        model: "test-model",
        iterations: 1,
        content: response,
        timing: { latencyMs: 50 },
        provider: "openai" as const,
        cached: false,
      };
    },
  });
}

function failFactory() {
  return (_model: string): ChatInstance => ({
    system() {
      return this;
    },
    user() {
      return this;
    },
    assistant() {
      return this;
    },
    addTool() {
      return this;
    },
    get messages() {
      return [];
    },
    async generate() {
      throw new Error("API down");
    },
    // biome-ignore lint/correctness/useYield: mock that throws before yielding
    async *stream() {
      throw new Error("API down");
    },
    get lastResult() {
      return null;
    },
  });
}

describe("generateSessionTitle", () => {
  let db: DatabaseHandle;

  beforeEach(async () => {
    db = await openTestDatabase();
    initChatTables(db);
  });

  afterEach(() => {
    db.close();
  });

  it("generates a title and writes it to the parent session", async () => {
    const parent = createSession(db, "web:chat:1", { purpose: "chat" });
    const title = await generateSessionTitle(
      db,
      parent.id as number,
      "explain monads in simple terms",
      "test-model",
      mockFactory("Monads Explained Simply"),
    );
    strictEqual(title, "Monads Explained Simply");
    const updated = getSession(db, parent.id as number);
    strictEqual(updated!.displayName, "Monads Explained Simply");
  });

  it("creates and closes a system session for tracking", async () => {
    const parent = createSession(db, "web:chat:2", { purpose: "chat" });
    await generateSessionTitle(
      db,
      parent.id as number,
      "hello",
      "test-model",
      mockFactory("Greeting"),
    );
    const systemSessions = listSessions(db, { purpose: "system" });
    strictEqual(systemSessions.length, 1);
    ok(systemSessions[0]!.key.includes(`system:title:${parent.id}`));
    ok(systemSessions[0]!.closedAt !== null);
  });

  it("tracks token usage on the system session", async () => {
    const parent = createSession(db, "web:chat:3", { purpose: "chat" });
    await generateSessionTitle(db, parent.id as number, "hello", "test-model", mockFactory("Hi"));
    const systemSessions = listSessions(db, { purpose: "system" });
    ok(systemSessions[0]!.tokensIn > 0 || systemSessions[0]!.tokensOut > 0);
    strictEqual(getSession(db, parent.id as number)!.costUsd, 0);
  });

  it("is a no-op when displayName is already set", async () => {
    const parent = createSession(db, "web:chat:4", { purpose: "chat" });
    renameSession(db, parent.id as number, "Human Title");
    const title = await generateSessionTitle(
      db,
      parent.id as number,
      "hello",
      "test-model",
      mockFactory("LLM Title"),
    );
    strictEqual(title, "Human Title");
    const updated = getSession(db, parent.id as number);
    strictEqual(updated!.displayName, "Human Title");
    const systemSessions = listSessions(db, { purpose: "system" });
    strictEqual(systemSessions.length, 0);
  });

  it("returns null for non-existent parent session", async () => {
    const title = await generateSessionTitle(
      db,
      99999,
      "hello",
      "test-model",
      mockFactory("Title"),
    );
    strictEqual(title, null);
  });

  it("strips surrounding quotes from LLM response", async () => {
    const parent = createSession(db, "web:chat:5", { purpose: "chat" });
    const title = await generateSessionTitle(
      db,
      parent.id as number,
      "hello",
      "test-model",
      mockFactory('"Monad Tutorial"'),
    );
    strictEqual(title, "Monad Tutorial");
  });

  it("closes system session even when LLM fails", async () => {
    const parent = createSession(db, "web:chat:6", { purpose: "chat" });
    const title = await generateSessionTitle(
      db,
      parent.id as number,
      "hello",
      "test-model",
      failFactory(),
    );
    strictEqual(title, null);
    const systemSessions = listSessions(db, { purpose: "system" });
    strictEqual(systemSessions.length, 1);
    ok(systemSessions[0]!.closedAt !== null);
  });

  it("does not set displayName when LLM returns an error", async () => {
    const parent = createSession(db, "web:chat:7", { purpose: "chat" });
    const title = await generateSessionTitle(
      db,
      parent.id as number,
      "hello",
      "test-model",
      failFactory(),
    );
    strictEqual(title, null);
    const updated = getSession(db, parent.id as number);
    strictEqual(updated!.displayName, null);
  });
});

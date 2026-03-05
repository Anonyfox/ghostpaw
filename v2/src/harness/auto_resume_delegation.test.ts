import { ok, strictEqual } from "node:assert/strict";
import { afterEach, beforeEach, describe, it } from "node:test";
import {
  addMessage,
  closeSession,
  createSession,
  getHistory,
  initChatTables,
} from "../core/chat/index.ts";
import type { DelegationRun } from "../core/runs/index.ts";
import { createRun, initRunsTable } from "../core/runs/index.ts";
import type { DatabaseHandle } from "../lib/index.ts";
import { openTestDatabase } from "../lib/index.ts";
import { autoResumeDelegation } from "./auto_resume_delegation.ts";
import type { ChannelNotifyFn } from "./notify_background_complete.ts";
import type { Entity } from "./types.ts";

let db: DatabaseHandle;

beforeEach(async () => {
  db = await openTestDatabase();
  initChatTables(db);
  initRunsTable(db);
});

afterEach(() => {
  db.close();
});

function makeRun(parentSessionId: number, overrides?: Partial<DelegationRun>): DelegationRun {
  const run = createRun(db, {
    parentSessionId,
    specialist: "scout",
    model: "test",
    task: "do something",
  });
  return {
    ...run,
    status: "completed",
    result: "Task done.",
    error: null,
    completedAt: Date.now(),
    ...overrides,
  };
}

interface TurnCall {
  sessionId: number;
  content: string;
}

function fakeEntity(opts?: { throws?: Error }): { entity: Entity; calls: TurnCall[] } {
  const calls: TurnCall[] = [];
  const entity: Entity = {
    db,
    workspace: "/tmp/test",
    async *streamTurn() {
      yield "";
      return { content: "", succeeded: true, usage: { inputTokens: 0, outputTokens: 0, reasoningTokens: 0, cachedTokens: 0 }, cost: { estimatedUsd: 0 } };
    },
    async executeTurn(sessionId: number, content: string) {
      calls.push({ sessionId, content });
      if (opts?.throws) throw opts.throws;
      addMessage(db, { sessionId, role: "user", content });
      addMessage(db, { sessionId, role: "assistant", content: "Here is the summary." });
      return { content: "Here is the summary.", succeeded: true, usage: { inputTokens: 10, outputTokens: 10, reasoningTokens: 0, cachedTokens: 0 }, cost: { estimatedUsd: 0.001 } };
    },
    async flush() {},
  };
  return { entity, calls };
}

describe("autoResumeDelegation", () => {
  it("calls entity.executeTurn with a system prompt containing the run result", async () => {
    const session = createSession(db, "test:1", { purpose: "chat" });
    addMessage(db, { sessionId: session.id as number, role: "user", content: "hi" });
    const run = makeRun(session.id as number);
    const { entity, calls } = fakeEntity();

    await autoResumeDelegation(db, entity, run);

    strictEqual(calls.length, 1);
    strictEqual(calls[0].sessionId, session.id as number);
    ok(calls[0].content.includes("scout"));
    ok(calls[0].content.includes("completed"));
    ok(calls[0].content.includes("Task done."));
  });

  it("fires channelNotify after successful auto-resume", async () => {
    const session = createSession(db, "test:2", { purpose: "chat" });
    addMessage(db, { sessionId: session.id as number, role: "user", content: "hi" });
    const run = makeRun(session.id as number);
    const { entity } = fakeEntity();

    let notifiedWith: { pid: number; run: DelegationRun } | null = null;
    const notify: ChannelNotifyFn = (pid, r) => {
      notifiedWith = { pid, run: r };
    };

    await autoResumeDelegation(db, entity, run, notify);

    ok(notifiedWith);
    strictEqual(notifiedWith!.pid, session.id as number);
    strictEqual(notifiedWith!.run.id, run.id);
  });

  it("falls back to static message when executeTurn throws", async () => {
    const session = createSession(db, "test:3", { purpose: "chat" });
    addMessage(db, { sessionId: session.id as number, role: "user", content: "hi" });
    const run = makeRun(session.id as number);
    const { entity } = fakeEntity({ throws: new Error("Budget exceeded") });

    let notified = false;
    const notify: ChannelNotifyFn = () => {
      notified = true;
    };

    await autoResumeDelegation(db, entity, run, notify);

    const history = getHistory(db, session.id as number);
    const fallback = history.find((m) => m.content.includes("Background task completed"));
    ok(fallback, "should fall back to static message");
    ok(notified, "channelNotify should still fire");
  });

  it("skips executeTurn when parent session is closed", async () => {
    const session = createSession(db, "test:4", { purpose: "chat" });
    addMessage(db, { sessionId: session.id as number, role: "user", content: "hi" });
    closeSession(db, session.id as number);
    const run = makeRun(session.id as number);
    const { entity, calls } = fakeEntity();

    let notified = false;
    const notify: ChannelNotifyFn = () => {
      notified = true;
    };

    await autoResumeDelegation(db, entity, run, notify);

    strictEqual(calls.length, 0, "should not call executeTurn");
    ok(notified, "channelNotify should still fire for closed sessions");
  });

  it("handles failed run status in the prompt", async () => {
    const session = createSession(db, "test:5", { purpose: "chat" });
    addMessage(db, { sessionId: session.id as number, role: "user", content: "hi" });
    const run = makeRun(session.id as number, {
      status: "failed",
      error: "Timeout exceeded",
      result: null,
    });
    const { entity, calls } = fakeEntity();

    await autoResumeDelegation(db, entity, run);

    strictEqual(calls.length, 1);
    ok(calls[0].content.includes("failed"));
    ok(calls[0].content.includes("Timeout exceeded"));
  });

  it("skips executeTurn when parent session does not exist", async () => {
    const session = createSession(db, "test:gone", { purpose: "chat" });
    const run = makeRun(session.id as number);
    db.prepare("DELETE FROM messages WHERE session_id = ?").run(session.id);
    db.prepare("DELETE FROM delegation_runs WHERE parent_session_id = ?").run(session.id);
    db.prepare("DELETE FROM sessions WHERE id = ?").run(session.id);
    const { entity, calls } = fakeEntity();

    await autoResumeDelegation(db, entity, run);

    strictEqual(calls.length, 0);
  });
});

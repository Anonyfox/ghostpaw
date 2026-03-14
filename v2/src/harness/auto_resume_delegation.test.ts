import { ok, strictEqual } from "node:assert/strict";
import { afterEach, beforeEach, describe, it } from "node:test";
import { getHistory } from "../core/chat/api/read/index.ts";
import { addMessage, closeSession, createSession } from "../core/chat/api/write/index.ts";
import { initChatTables } from "../core/chat/runtime/index.ts";
import type { DatabaseHandle } from "../lib/index.ts";
import { openTestDatabase } from "../lib/index.ts";
import { autoResumeDelegation } from "./auto_resume_delegation.ts";
import type { ChannelNotifyFn } from "./notify_background_complete.ts";
import type { DelegationOutcome, Entity } from "./types.ts";

let db: DatabaseHandle;

beforeEach(async () => {
  db = await openTestDatabase();
  initChatTables(db);
});

afterEach(() => {
  db.close();
});

function makeOutcome(
  parentSessionId: number,
  overrides?: Partial<DelegationOutcome>,
): DelegationOutcome {
  return {
    childSessionId: 99,
    parentSessionId,
    specialist: "scout",
    status: "completed",
    result: "Task done.",
    error: null,
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
      return {
        content: "",
        succeeded: true,
        messageId: 0,
        model: "test",
        iterations: 1,
        usage: {
          inputTokens: 0,
          outputTokens: 0,
          reasoningTokens: 0,
          cachedTokens: 0,
          totalTokens: 0,
        },
        cost: { estimatedUsd: 0 },
      };
    },
    async executeTurn(sessionId: number, content: string) {
      calls.push({ sessionId, content });
      if (opts?.throws) throw opts.throws;
      addMessage(db, { sessionId, role: "user", content });
      addMessage(db, { sessionId, role: "assistant", content: "Here is the summary." });
      return {
        content: "Here is the summary.",
        succeeded: true,
        messageId: 0,
        model: "test",
        iterations: 1,
        usage: {
          inputTokens: 10,
          outputTokens: 10,
          reasoningTokens: 0,
          cachedTokens: 0,
          totalTokens: 20,
        },
        cost: { estimatedUsd: 0.001 },
      };
    },
    async flush() {},
  };
  return { entity, calls };
}

describe("autoResumeDelegation", () => {
  it("calls entity.executeTurn with a system prompt containing the delegation result", async () => {
    const session = createSession(db, "test:1", { purpose: "chat" });
    addMessage(db, { sessionId: session.id as number, role: "user", content: "hi" });
    const outcome = makeOutcome(session.id as number);
    const { entity, calls } = fakeEntity();

    await autoResumeDelegation(db, entity, outcome);

    strictEqual(calls.length, 1);
    strictEqual(calls[0].sessionId, session.id as number);
    ok(calls[0].content.includes("scout"));
    ok(calls[0].content.includes("completed"));
    ok(calls[0].content.includes("Task done."));
  });

  it("fires channelNotify after successful auto-resume", async () => {
    const session = createSession(db, "test:2", { purpose: "chat" });
    addMessage(db, { sessionId: session.id as number, role: "user", content: "hi" });
    const outcome = makeOutcome(session.id as number);
    const { entity } = fakeEntity();

    let notifiedWith: { pid: number; outcome: DelegationOutcome } | null = null;
    const notify: ChannelNotifyFn = (pid, o) => {
      notifiedWith = { pid, outcome: o };
    };

    await autoResumeDelegation(db, entity, outcome, notify);

    ok(notifiedWith);
    const nw = notifiedWith as { pid: number; outcome: DelegationOutcome };
    strictEqual(nw.pid, session.id as number);
    strictEqual(nw.outcome.specialist, "scout");
  });

  it("falls back to static message when executeTurn throws", async () => {
    const session = createSession(db, "test:3", { purpose: "chat" });
    addMessage(db, { sessionId: session.id as number, role: "user", content: "hi" });
    const outcome = makeOutcome(session.id as number);
    const { entity } = fakeEntity({ throws: new Error("Budget exceeded") });

    let notified = false;
    const notify: ChannelNotifyFn = () => {
      notified = true;
    };

    await autoResumeDelegation(db, entity, outcome, notify);

    const history = getHistory(db, session.id as number);
    const fallback = history.find((m) => m.content.includes("Background task completed"));
    ok(fallback, "should fall back to static message");
    ok(notified, "channelNotify should still fire");
  });

  it("skips executeTurn when parent session is closed", async () => {
    const session = createSession(db, "test:4", { purpose: "chat" });
    addMessage(db, { sessionId: session.id as number, role: "user", content: "hi" });
    closeSession(db, session.id as number);
    const outcome = makeOutcome(session.id as number);
    const { entity, calls } = fakeEntity();

    let notified = false;
    const notify: ChannelNotifyFn = () => {
      notified = true;
    };

    await autoResumeDelegation(db, entity, outcome, notify);

    strictEqual(calls.length, 0, "should not call executeTurn");
    ok(notified, "channelNotify should still fire for closed sessions");
  });

  it("handles failed delegation status in the prompt", async () => {
    const session = createSession(db, "test:5", { purpose: "chat" });
    addMessage(db, { sessionId: session.id as number, role: "user", content: "hi" });
    const outcome = makeOutcome(session.id as number, {
      status: "failed",
      error: "Timeout exceeded",
      result: null,
    });
    const { entity, calls } = fakeEntity();

    await autoResumeDelegation(db, entity, outcome);

    strictEqual(calls.length, 1);
    ok(calls[0].content.includes("failed"));
    ok(calls[0].content.includes("Timeout exceeded"));
  });

  it("skips executeTurn when parent session does not exist", async () => {
    const session = createSession(db, "test:gone", { purpose: "chat" });
    const sid = session.id as number;
    const outcome = makeOutcome(sid);
    db.prepare("DELETE FROM sessions WHERE id = ?").run(sid);
    const { entity, calls } = fakeEntity();

    await autoResumeDelegation(db, entity, outcome);

    strictEqual(calls.length, 0);
  });
});

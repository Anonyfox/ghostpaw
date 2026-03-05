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
import type { ChannelNotifyFn } from "./notify_background_complete.ts";
import { notifyBackgroundComplete } from "./notify_background_complete.ts";

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

describe("notifyBackgroundComplete", () => {
  it("injects an assistant message into the parent session", () => {
    const session = createSession(db, "test:1", { purpose: "chat" });
    addMessage(db, { sessionId: session.id as number, role: "user", content: "hi" });
    const run = makeRun(session.id as number);

    notifyBackgroundComplete(db, run);

    const history = getHistory(db, session.id as number);
    const injected = history.find((m) => m.content.includes("Background task completed"));
    ok(injected, "should inject assistant message");
    ok(injected!.content.includes("scout"));
    ok(injected!.content.includes("Task done."));
  });

  it("injects failure message when run failed", () => {
    const session = createSession(db, "test:2", { purpose: "chat" });
    addMessage(db, { sessionId: session.id as number, role: "user", content: "hi" });
    const run = makeRun(session.id as number, { status: "failed", error: "Timeout", result: null });

    notifyBackgroundComplete(db, run);

    const history = getHistory(db, session.id as number);
    const injected = history.find((m) => m.content.includes("Background task failed"));
    ok(injected);
    ok(injected!.content.includes("Timeout"));
  });

  it("skips message injection when parent session is closed", () => {
    const session = createSession(db, "test:3", { purpose: "chat" });
    addMessage(db, { sessionId: session.id as number, role: "user", content: "hi" });
    closeSession(db, session.id as number);
    const run = makeRun(session.id as number);

    let notified = false;
    const channelNotify: ChannelNotifyFn = () => {
      notified = true;
    };
    notifyBackgroundComplete(db, run, channelNotify);

    const history = getHistory(db, session.id as number);
    const injected = history.find((m) => m.content.includes("Background task"));
    strictEqual(injected, undefined, "should not inject into closed session");
    ok(notified, "channel notify should still fire");
  });

  it("calls channelNotify callback with correct args", () => {
    const session = createSession(db, "test:4", { purpose: "chat" });
    addMessage(db, { sessionId: session.id as number, role: "user", content: "hi" });
    const run = makeRun(session.id as number);

    let calledWith: { parentSessionId: number; run: DelegationRun } | null = null;
    const channelNotify: ChannelNotifyFn = (pid, r) => {
      calledWith = { parentSessionId: pid, run: r };
    };
    notifyBackgroundComplete(db, run, channelNotify);

    ok(calledWith);
    const cw = calledWith as { parentSessionId: number; run: DelegationRun };
    strictEqual(cw.parentSessionId, session.id as number);
    strictEqual(cw.run.id, run.id);
  });

  it("does not throw when channelNotify is undefined", () => {
    const session = createSession(db, "test:5", { purpose: "chat" });
    addMessage(db, { sessionId: session.id as number, role: "user", content: "hi" });
    const run = makeRun(session.id as number);

    notifyBackgroundComplete(db, run);
  });
});

import { ok, strictEqual } from "node:assert/strict";
import { afterEach, beforeEach, describe, it } from "node:test";
import {
  addMessage,
  closeSession,
  createSession,
  getHistory,
  initChatTables,
} from "../core/chat/index.ts";
import type { DatabaseHandle } from "../lib/index.ts";
import { openTestDatabase } from "../lib/index.ts";
import type { ChannelNotifyFn } from "./notify_background_complete.ts";
import { notifyBackgroundComplete } from "./notify_background_complete.ts";
import type { DelegationOutcome } from "./types.ts";

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

describe("notifyBackgroundComplete", () => {
  it("injects an assistant message into the parent session", () => {
    const session = createSession(db, "test:1", { purpose: "chat" });
    addMessage(db, { sessionId: session.id as number, role: "user", content: "hi" });
    const outcome = makeOutcome(session.id as number);

    notifyBackgroundComplete(db, outcome);

    const history = getHistory(db, session.id as number);
    const injected = history.find((m) => m.content.includes("Background task completed"));
    ok(injected, "should inject assistant message");
    ok(injected!.content.includes("scout"));
    ok(injected!.content.includes("Task done."));
  });

  it("injects failure message when delegation failed", () => {
    const session = createSession(db, "test:2", { purpose: "chat" });
    addMessage(db, { sessionId: session.id as number, role: "user", content: "hi" });
    const outcome = makeOutcome(session.id as number, {
      status: "failed",
      error: "Timeout",
      result: null,
    });

    notifyBackgroundComplete(db, outcome);

    const history = getHistory(db, session.id as number);
    const injected = history.find((m) => m.content.includes("Background task failed"));
    ok(injected);
    ok(injected!.content.includes("Timeout"));
  });

  it("skips message injection when parent session is closed", () => {
    const session = createSession(db, "test:3", { purpose: "chat" });
    addMessage(db, { sessionId: session.id as number, role: "user", content: "hi" });
    closeSession(db, session.id as number);
    const outcome = makeOutcome(session.id as number);

    let notified = false;
    const channelNotify: ChannelNotifyFn = () => {
      notified = true;
    };
    notifyBackgroundComplete(db, outcome, channelNotify);

    const history = getHistory(db, session.id as number);
    const injected = history.find((m) => m.content.includes("Background task"));
    strictEqual(injected, undefined, "should not inject into closed session");
    ok(notified, "channel notify should still fire");
  });

  it("calls channelNotify callback with correct args", () => {
    const session = createSession(db, "test:4", { purpose: "chat" });
    addMessage(db, { sessionId: session.id as number, role: "user", content: "hi" });
    const outcome = makeOutcome(session.id as number);

    let calledWith: { parentSessionId: number; outcome: DelegationOutcome } | null = null;
    const channelNotify: ChannelNotifyFn = (pid, o) => {
      calledWith = { parentSessionId: pid, outcome: o };
    };
    notifyBackgroundComplete(db, outcome, channelNotify);

    ok(calledWith);
    const cw = calledWith as { parentSessionId: number; outcome: DelegationOutcome };
    strictEqual(cw.parentSessionId, session.id as number);
    strictEqual(cw.outcome.specialist, "scout");
  });

  it("does not throw when channelNotify is undefined", () => {
    const session = createSession(db, "test:5", { purpose: "chat" });
    addMessage(db, { sessionId: session.id as number, role: "user", content: "hi" });
    const outcome = makeOutcome(session.id as number);

    notifyBackgroundComplete(db, outcome);
  });
});

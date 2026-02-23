import { ok, strictEqual } from "node:assert";
import { beforeEach, describe, it } from "node:test";
import { createDatabase, type GhostpawDatabase } from "./database.js";
import { createRunStore, type RunStore } from "./runs.js";
import { createSessionStore, type SessionStore } from "./session.js";

let db: GhostpawDatabase;
let runs: RunStore;
let sessions: SessionStore;

beforeEach(async () => {
  db = await createDatabase(":memory:");
  sessions = createSessionStore(db);
  runs = createRunStore(db);
});

describe("RunStore - create", () => {
  it("creates a run with running status", () => {
    const session = sessions.createSession("test");
    const run = runs.create({ sessionId: session.id, prompt: "do something" });

    strictEqual(run.status, "running");
    strictEqual(run.prompt, "do something");
    strictEqual(run.agentProfile, "default");
    strictEqual(run.sessionId, session.id);
    strictEqual(run.parentSessionId, null);
    strictEqual(run.result, null);
    strictEqual(run.error, null);
    ok(run.id.length > 0);
    ok(run.createdAt > 0);
    ok(run.startedAt > 0);
  });

  it("creates a run with custom agent profile and parent session", () => {
    const parent = sessions.createSession("parent");
    const child = sessions.createSession("child");

    const run = runs.create({
      sessionId: child.id,
      prompt: "research task",
      agentProfile: "researcher",
      parentSessionId: parent.id,
    });

    strictEqual(run.agentProfile, "researcher");
    strictEqual(run.parentSessionId, parent.id);
  });
});

describe("RunStore - lifecycle", () => {
  it("complete transitions to completed with result", () => {
    const session = sessions.createSession("test");
    const run = runs.create({ sessionId: session.id, prompt: "task" });

    runs.complete(run.id, "task result here");
    const updated = runs.get(run.id);
    ok(updated);
    strictEqual(updated.status, "completed");
    strictEqual(updated.result, "task result here");
    ok(updated.completedAt! > 0);
  });

  it("fail transitions to failed with error", () => {
    const session = sessions.createSession("test");
    const run = runs.create({ sessionId: session.id, prompt: "task" });

    runs.fail(run.id, "connection lost");
    const updated = runs.get(run.id);
    ok(updated);
    strictEqual(updated.status, "failed");
    strictEqual(updated.error, "connection lost");
    ok(updated.completedAt! > 0);
  });
});

describe("RunStore - get", () => {
  it("returns null for unknown run ID", () => {
    strictEqual(runs.get("nonexistent"), null);
  });

  it("returns the full run object", () => {
    const session = sessions.createSession("test");
    const run = runs.create({ sessionId: session.id, prompt: "hello" });

    const fetched = runs.get(run.id);
    ok(fetched);
    strictEqual(fetched.id, run.id);
    strictEqual(fetched.prompt, "hello");
    strictEqual(fetched.announced, false);
  });
});

describe("RunStore - getActive", () => {
  it("returns the running run for a session (non-delegated only)", () => {
    const session = sessions.createSession("test");
    const run = runs.create({ sessionId: session.id, prompt: "active task" });

    const active = runs.getActive(session.id);
    ok(active);
    strictEqual(active.id, run.id);
    strictEqual(active.status, "running");
  });

  it("returns null when no running run exists", () => {
    const session = sessions.createSession("test");
    strictEqual(runs.getActive(session.id), null);
  });

  it("returns null after run completes", () => {
    const session = sessions.createSession("test");
    const run = runs.create({ sessionId: session.id, prompt: "task" });
    runs.complete(run.id, "done");

    strictEqual(runs.getActive(session.id), null);
  });

  it("excludes delegated runs (those with parent_session_id)", () => {
    const session = sessions.createSession("test");
    runs.create({
      sessionId: session.id,
      prompt: "delegated",
      parentSessionId: session.id,
    });

    strictEqual(runs.getActive(session.id), null);
  });
});

describe("RunStore - getCompletedDelegations", () => {
  it("returns completed child runs for a parent session", () => {
    const parent = sessions.createSession("parent");
    const child1 = sessions.createSession("child1");
    const child2 = sessions.createSession("child2");

    const r1 = runs.create({
      sessionId: child1.id,
      prompt: "task 1",
      parentSessionId: parent.id,
      agentProfile: "researcher",
    });
    runs.complete(r1.id, "result 1");

    const r2 = runs.create({
      sessionId: child2.id,
      prompt: "task 2",
      parentSessionId: parent.id,
      agentProfile: "coder",
    });
    runs.complete(r2.id, "result 2");

    const results = runs.getCompletedDelegations(parent.id);
    strictEqual(results.length, 2);
    ok(results.some((r) => r.result === "result 1"));
    ok(results.some((r) => r.result === "result 2"));
  });

  it("excludes already-announced runs", () => {
    const parent = sessions.createSession("parent");
    const child = sessions.createSession("child");

    const r = runs.create({
      sessionId: child.id,
      prompt: "task",
      parentSessionId: parent.id,
    });
    runs.complete(r.id, "done");
    runs.markAnnounced(r.id);

    strictEqual(runs.getCompletedDelegations(parent.id).length, 0);
  });

  it("excludes failed and running runs", () => {
    const parent = sessions.createSession("parent");
    const c1 = sessions.createSession("c1");
    const c2 = sessions.createSession("c2");

    runs.create({ sessionId: c1.id, prompt: "t1", parentSessionId: parent.id });

    const r2 = runs.create({ sessionId: c2.id, prompt: "t2", parentSessionId: parent.id });
    runs.fail(r2.id, "error");

    strictEqual(runs.getCompletedDelegations(parent.id).length, 0);
  });

  it("does not return runs from different parent sessions", () => {
    const p1 = sessions.createSession("parent1");
    const p2 = sessions.createSession("parent2");
    const child = sessions.createSession("child");

    const r = runs.create({ sessionId: child.id, prompt: "task", parentSessionId: p2.id });
    runs.complete(r.id, "done");

    strictEqual(runs.getCompletedDelegations(p1.id).length, 0);
    strictEqual(runs.getCompletedDelegations(p2.id).length, 1);
  });
});

describe("RunStore - markAnnounced", () => {
  it("sets the announced flag to true", () => {
    const session = sessions.createSession("test");
    const run = runs.create({ sessionId: session.id, prompt: "task" });
    runs.complete(run.id, "done");

    strictEqual(runs.get(run.id)!.announced, false);
    runs.markAnnounced(run.id);
    strictEqual(runs.get(run.id)!.announced, true);
  });
});

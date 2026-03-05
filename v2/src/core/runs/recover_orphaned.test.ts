import { ok, strictEqual } from "node:assert";
import { afterEach, beforeEach, describe, it } from "node:test";
import type { DatabaseHandle } from "../../lib/index.ts";
import { openTestDatabase } from "../../lib/index.ts";
import { createSession, getSession, initChatTables } from "../chat/index.ts";
import { createRun } from "./create_run.ts";
import { getRun } from "./get_run.ts";
import { linkChildSession } from "./link_child_session.ts";
import { recoverOrphanedRuns } from "./recover_orphaned.ts";
import { initRunsTable } from "./schema.ts";

let db: DatabaseHandle;

beforeEach(async () => {
  db = await openTestDatabase();
  initChatTables(db);
  initRunsTable(db);
});

afterEach(() => {
  db.close();
});

describe("recoverOrphanedRuns", () => {
  it("marks running runs as failed with descriptive error", () => {
    const session = createSession(db, "test:parent", { purpose: "chat" });
    const run = createRun(db, {
      parentSessionId: session.id as number,
      model: "test-model",
      task: "orphaned task",
    });

    const recovered = recoverOrphanedRuns(db);
    strictEqual(recovered, 1);

    const updated = getRun(db, run.id)!;
    strictEqual(updated.status, "failed");
    ok(updated.error!.includes("interrupted"));
    ok(updated.completedAt != null);
  });

  it("closes child sessions of orphaned runs", () => {
    const parent = createSession(db, "test:parent", { purpose: "chat" });
    const run = createRun(db, {
      parentSessionId: parent.id as number,
      model: "test-model",
      task: "orphaned with child",
    });
    const child = createSession(db, "test:child", {
      purpose: "delegate",
      parentSessionId: parent.id as number,
    });
    linkChildSession(db, run.id, child.id as number);

    recoverOrphanedRuns(db);

    const updatedChild = getSession(db, child.id as number)!;
    ok(updatedChild.closedAt != null);
  });

  it("leaves completed and failed runs untouched", () => {
    const parent = createSession(db, "test:parent", { purpose: "chat" });
    const run1 = createRun(db, {
      parentSessionId: parent.id as number,
      model: "test-model",
      task: "completed task",
    });
    db.prepare(
      "UPDATE delegation_runs SET status = 'completed', result = 'done', completed_at = ? WHERE id = ?",
    ).run(Date.now(), run1.id);

    const run2 = createRun(db, {
      parentSessionId: parent.id as number,
      model: "test-model",
      task: "failed task",
    });
    db.prepare(
      "UPDATE delegation_runs SET status = 'failed', error = 'boom', completed_at = ? WHERE id = ?",
    ).run(Date.now(), run2.id);

    const recovered = recoverOrphanedRuns(db);
    strictEqual(recovered, 0);

    strictEqual(getRun(db, run1.id)!.status, "completed");
    strictEqual(getRun(db, run2.id)!.status, "failed");
  });

  it("handles runs without linked child sessions", () => {
    const parent = createSession(db, "test:parent", { purpose: "chat" });
    createRun(db, {
      parentSessionId: parent.id as number,
      model: "test-model",
      task: "no child yet",
    });

    const recovered = recoverOrphanedRuns(db);
    strictEqual(recovered, 1);
  });

  it("returns zero when no orphaned runs exist", () => {
    strictEqual(recoverOrphanedRuns(db), 0);
  });

  it("recovers multiple orphaned runs atomically", () => {
    const parent = createSession(db, "test:parent", { purpose: "chat" });
    createRun(db, {
      parentSessionId: parent.id as number,
      model: "m1",
      task: "orphan 1",
    });
    createRun(db, {
      parentSessionId: parent.id as number,
      model: "m2",
      task: "orphan 2",
    });
    createRun(db, {
      parentSessionId: parent.id as number,
      model: "m3",
      task: "orphan 3",
    });

    const recovered = recoverOrphanedRuns(db);
    strictEqual(recovered, 3);

    const remaining = db
      .prepare("SELECT count(*) as c FROM delegation_runs WHERE status = 'running'")
      .get() as { c: number };
    strictEqual(remaining.c, 0);
  });
});

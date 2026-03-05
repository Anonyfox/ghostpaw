import { ok, strictEqual } from "node:assert";
import { afterEach, beforeEach, describe, it } from "node:test";
import type { DatabaseHandle } from "../../lib/index.ts";
import { openTestDatabase } from "../../lib/index.ts";
import { createSession } from "../chat/create_session.ts";
import { initChatTables } from "../chat/schema.ts";
import { createRun } from "./create_run.ts";
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

describe("createRun", () => {
  it("creates a run with all fields populated", () => {
    const session = createSession(db, "parent");
    const run = createRun(db, {
      parentSessionId: session.id as number,
      model: "gpt-4o",
      task: "write tests",
    });
    ok(run.id > 0);
    strictEqual(run.parentSessionId, session.id);
    strictEqual(run.childSessionId, null);
    strictEqual(run.specialist, "default");
    strictEqual(run.model, "gpt-4o");
    strictEqual(run.task, "write tests");
    strictEqual(run.status, "running");
    strictEqual(run.result, null);
    strictEqual(run.error, null);
    strictEqual(run.tokensIn, 0);
    strictEqual(run.tokensOut, 0);
    strictEqual(run.costUsd, 0);
    ok(run.createdAt > 0);
    strictEqual(run.completedAt, null);
  });

  it("defaults status to running", () => {
    const session = createSession(db, "parent");
    const run = createRun(db, {
      parentSessionId: session.id as number,
      model: "gpt-4o",
      task: "do it",
    });
    strictEqual(run.status, "running");
    const row = db.prepare("SELECT status FROM delegation_runs WHERE id = ?").get(run.id);
    strictEqual(row!.status, "running");
  });

  it("accepts a custom specialist", () => {
    const session = createSession(db, "parent");
    const run = createRun(db, {
      parentSessionId: session.id as number,
      model: "gpt-4o",
      task: "style the page",
      specialist: "js-engineer",
    });
    strictEqual(run.specialist, "js-engineer");
  });

  it("persists the run to the database", () => {
    const session = createSession(db, "parent");
    const run = createRun(db, {
      parentSessionId: session.id as number,
      model: "claude-sonnet-4-20250514",
      task: "refactor",
    });
    const row = db.prepare("SELECT * FROM delegation_runs WHERE id = ?").get(run.id);
    ok(row);
    strictEqual(row.task, "refactor");
    strictEqual(row.model, "claude-sonnet-4-20250514");
  });
});

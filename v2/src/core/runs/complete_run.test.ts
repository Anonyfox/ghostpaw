import { ok, strictEqual } from "node:assert";
import { afterEach, beforeEach, describe, it } from "node:test";
import type { DatabaseHandle } from "../../lib/index.ts";
import { openTestDatabase } from "../../lib/index.ts";
import { createSession } from "../chat/create_session.ts";
import { initChatTables } from "../chat/schema.ts";
import { completeRun } from "./complete_run.ts";
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

describe("completeRun", () => {
  it("sets status to completed with result and completed_at", () => {
    const session = createSession(db, "p");
    const run = createRun(db, {
      parentSessionId: session.id as number,
      model: "gpt-4o",
      task: "t",
    });
    completeRun(db, run.id, "All done.");
    const row = db.prepare("SELECT * FROM delegation_runs WHERE id = ?").get(run.id);
    strictEqual(row!.status, "completed");
    strictEqual(row!.result, "All done.");
    ok((row!.completed_at as number) > 0);
  });
});

import { ok, strictEqual } from "node:assert";
import { afterEach, beforeEach, describe, it } from "node:test";
import type { DatabaseHandle } from "../../lib/index.ts";
import { openTestDatabase } from "../../lib/index.ts";
import { createSession } from "../chat/create_session.ts";
import { initChatTables } from "../chat/schema.ts";
import { createRun } from "./create_run.ts";
import { getRun } from "./get_run.ts";
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

describe("getRun", () => {
  it("returns the run by id", () => {
    const session = createSession(db, "p");
    const run = createRun(db, {
      parentSessionId: session.id as number,
      model: "gpt-4o",
      task: "do it",
      specialist: "js-engineer",
    });
    const result = getRun(db, run.id);
    ok(result);
    strictEqual(result.id, run.id);
    strictEqual(result.task, "do it");
    strictEqual(result.specialist, "js-engineer");
    strictEqual(result.status, "running");
  });

  it("returns null for unknown id", () => {
    strictEqual(getRun(db, 99999), null);
  });
});

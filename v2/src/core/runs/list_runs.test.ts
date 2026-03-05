import { strictEqual } from "node:assert";
import { afterEach, beforeEach, describe, it } from "node:test";
import type { DatabaseHandle } from "../../lib/index.ts";
import { openTestDatabase } from "../../lib/index.ts";
import { createSession } from "../chat/create_session.ts";
import { initChatTables } from "../chat/schema.ts";
import { completeRun } from "./complete_run.ts";
import { createRun } from "./create_run.ts";
import { listRuns } from "./list_runs.ts";
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

describe("listRuns", () => {
  it("returns runs for a given parent session", () => {
    const s1 = createSession(db, "s1");
    const s2 = createSession(db, "s2");
    createRun(db, { parentSessionId: s1.id as number, model: "m", task: "a" });
    createRun(db, { parentSessionId: s1.id as number, model: "m", task: "b" });
    createRun(db, { parentSessionId: s2.id as number, model: "m", task: "c" });
    const runs = listRuns(db, s1.id as number);
    strictEqual(runs.length, 2);
  });

  it("filters by status", () => {
    const s = createSession(db, "s");
    const r1 = createRun(db, { parentSessionId: s.id as number, model: "m", task: "a" });
    createRun(db, { parentSessionId: s.id as number, model: "m", task: "b" });
    completeRun(db, r1.id, "done");
    strictEqual(listRuns(db, s.id as number, "completed").length, 1);
    strictEqual(listRuns(db, s.id as number, "running").length, 1);
    strictEqual(listRuns(db, s.id as number, "failed").length, 0);
  });

  it("returns empty array for no matches", () => {
    strictEqual(listRuns(db, 99999).length, 0);
  });
});

import { strictEqual } from "node:assert";
import { afterEach, beforeEach, describe, it } from "node:test";
import type { DatabaseHandle } from "../../lib/index.ts";
import { openTestDatabase } from "../../lib/index.ts";
import { createSession } from "../chat/create_session.ts";
import { initChatTables } from "../chat/schema.ts";
import { createRun } from "./create_run.ts";
import { linkChildSession } from "./link_child_session.ts";
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

describe("linkChildSession", () => {
  it("sets child_session_id on the run", () => {
    const parent = createSession(db, "parent");
    const child = createSession(db, "child");
    const run = createRun(db, {
      parentSessionId: parent.id as number,
      model: "gpt-4o",
      task: "t",
    });
    linkChildSession(db, run.id, child.id as number);
    const row = db.prepare("SELECT child_session_id FROM delegation_runs WHERE id = ?").get(run.id);
    strictEqual(row!.child_session_id, child.id);
  });
});

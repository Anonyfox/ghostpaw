import { ok, strictEqual } from "node:assert";
import { afterEach, beforeEach, describe, it } from "node:test";
import type { DatabaseHandle } from "../../lib/index.ts";
import { openTestDatabase } from "../../lib/index.ts";
import { initChatTables } from "../chat/schema.ts";
import { initRunsTable } from "./schema.ts";

let db: DatabaseHandle;

beforeEach(async () => {
  db = await openTestDatabase();
  initChatTables(db);
});

afterEach(() => {
  db.close();
});

describe("initRunsTable", () => {
  it("creates the delegation_runs table with expected columns", () => {
    initRunsTable(db);
    const cols = db.prepare("PRAGMA table_info(delegation_runs)").all() as { name: string }[];
    const names = cols.map((c) => c.name);
    ok(names.includes("id"));
    ok(names.includes("parent_session_id"));
    ok(names.includes("child_session_id"));
    ok(names.includes("specialist"));
    ok(names.includes("model"));
    ok(names.includes("task"));
    ok(names.includes("status"));
    ok(names.includes("result"));
    ok(names.includes("error"));
    ok(names.includes("tokens_in"));
    ok(names.includes("tokens_out"));
    ok(names.includes("reasoning_tokens"));
    ok(names.includes("cached_tokens"));
    ok(names.includes("cost_usd"));
    ok(names.includes("created_at"));
    ok(names.includes("completed_at"));
    strictEqual(names.length, 16);
  });

  it("creates the parent_session_id index", () => {
    initRunsTable(db);
    const indexes = db.prepare("PRAGMA index_list(delegation_runs)").all() as { name: string }[];
    ok(indexes.some((i) => i.name.includes("delegation_runs_parent")));
  });

  it("is idempotent", () => {
    initRunsTable(db);
    initRunsTable(db);
    const cols = db.prepare("PRAGMA table_info(delegation_runs)").all();
    strictEqual(cols.length, 16);
  });
});

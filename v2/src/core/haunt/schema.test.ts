import { ok } from "node:assert";
import { afterEach, beforeEach, describe, it } from "node:test";
import type { DatabaseHandle } from "../../lib/index.ts";
import { openTestDatabase } from "../../lib/index.ts";
import { initChatTables } from "../chat/index.ts";
import { initHauntTables } from "./schema.ts";

let db: DatabaseHandle;

beforeEach(async () => {
  db = await openTestDatabase();
  initChatTables(db);
  initHauntTables(db);
});

afterEach(() => {
  db.close();
});

describe("initHauntTables", () => {
  it("creates the haunts table", () => {
    const row = db
      .prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='haunts'")
      .get() as { name: string } | undefined;
    ok(row);
  });

  it("is idempotent", () => {
    initHauntTables(db);
    initHauntTables(db);
    const row = db
      .prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='haunts'")
      .get() as { name: string } | undefined;
    ok(row);
  });
});

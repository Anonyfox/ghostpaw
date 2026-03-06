import { ok } from "node:assert";
import { afterEach, beforeEach, describe, it } from "node:test";
import type { DatabaseHandle } from "../../lib/index.ts";
import { openTestDatabase } from "../../lib/index.ts";
import { initChatTables } from "../chat/index.ts";
import { initHowlTables } from "./schema.ts";

let db: DatabaseHandle;

beforeEach(async () => {
  db = await openTestDatabase();
  initChatTables(db);
  initHowlTables(db);
});

afterEach(() => {
  db.close();
});

describe("initHowlTables", () => {
  it("creates the howls table", () => {
    const row = db
      .prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='howls'")
      .get() as { name: string } | undefined;
    ok(row);
  });

  it("is idempotent", () => {
    initHowlTables(db);
    initHowlTables(db);
    const row = db
      .prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='howls'")
      .get() as { name: string } | undefined;
    ok(row);
  });
});

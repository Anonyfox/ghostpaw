import assert from "node:assert";
import { describe, it } from "node:test";
import { openMemoryDatabase } from "./open.ts";

describe("openMemoryDatabase", () => {
  it("creates tables successfully", () => {
    const db = openMemoryDatabase();
    const sessions = db
      .prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='sessions'")
      .get();
    assert.ok(sessions);

    const messages = db
      .prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='messages'")
      .get();
    assert.ok(messages);

    const toolCalls = db
      .prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='tool_calls'")
      .get();
    assert.ok(toolCalls);

    db.close();
  });

  it("supports foreign keys", () => {
    const db = openMemoryDatabase();
    const result = db.prepare("PRAGMA foreign_keys").get() as { foreign_keys: number };
    assert.strictEqual(result.foreign_keys, 1);
    db.close();
  });
});

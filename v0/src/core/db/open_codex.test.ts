import assert from "node:assert";
import { describe, it } from "node:test";
import { write } from "@ghostpaw/codex";
import { openMemoryCodexDatabase } from "./open_codex.ts";

describe("openMemoryCodexDatabase", () => {
  it("opens and initializes codex tables", () => {
    const db = openMemoryCodexDatabase();

    const tables = db
      .prepare("SELECT name FROM sqlite_master WHERE type = 'table' ORDER BY name")
      .all() as { name: string }[];
    const names = tables.map((t) => t.name);

    assert.ok(names.includes("beliefs"), "should have beliefs table");
    db.close();
  });

  it("supports codex write operations through the handle", () => {
    const db = openMemoryCodexDatabase();

    // biome-ignore lint/suspicious/noExplicitAny: DatabaseHandle satisfies CodexDb at runtime
    const result = write.remember(db as any, {
      claim: "The sky is blue",
      source: "explicit",
      category: "fact",
    });
    assert.ok(result);
    assert.ok(result.id > 0);
    assert.strictEqual(result.claim, "The sky is blue");

    const row = db.prepare("SELECT * FROM beliefs WHERE id = ?").get(result.id);
    assert.ok(row, "belief should be persisted in the database");

    db.close();
  });
});

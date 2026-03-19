import { ok, strictEqual } from "node:assert";
import { describe, it } from "node:test";
import { openTestDatabase } from "../../lib/open_test_database.ts";
import { initSoulsTables } from "./schema.ts";
import { stampAttuned } from "./stamp_attuned.ts";

describe("stampAttuned", () => {
  it("sets last_attuned_at on the soul row", async () => {
    const db = await openTestDatabase();
    initSoulsTables(db);
    const now = Date.now();
    db.prepare(
      "INSERT INTO souls (id, name, essence, description, level, created_at, updated_at) VALUES (?, ?, '', '', 0, ?, ?)",
    ).run(1, "Test", now, now);

    const before = db.prepare("SELECT last_attuned_at FROM souls WHERE id = 1").get() as {
      last_attuned_at: number | null;
    };
    strictEqual(before.last_attuned_at, null);

    stampAttuned(db, 1);

    const after = db.prepare("SELECT last_attuned_at FROM souls WHERE id = 1").get() as {
      last_attuned_at: number;
    };
    ok(after.last_attuned_at > 0);
    db.close();
  });
});

import { strictEqual } from "node:assert";
import { beforeEach, describe, it } from "node:test";
import { type DatabaseHandle, openTestDatabase } from "../../lib/index.ts";
import { interactionsSince } from "./interactions_since.ts";
import { initPackTables } from "./runtime/schema.ts";

let db: DatabaseHandle;

beforeEach(async () => {
  db = await openTestDatabase();
  initPackTables(db);
});

describe("interactionsSince", () => {
  it("returns empty when no interactions exist", () => {
    strictEqual(interactionsSince(db, 0).length, 0);
  });

  it("filters by created_at", () => {
    const now = Date.now();
    db.prepare(
      "INSERT INTO pack_members (name, kind, is_user, first_contact, last_contact, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)",
    ).run("Alice", "human", 1, now, now, now, now);
    db.prepare(
      "INSERT INTO pack_interactions (member_id, kind, summary, created_at) VALUES (?, ?, ?, ?)",
    ).run(1, "conversation", "old interaction", now - 200_000);
    db.prepare(
      "INSERT INTO pack_interactions (member_id, kind, summary, created_at) VALUES (?, ?, ?, ?)",
    ).run(1, "conversation", "new interaction", now);
    const results = interactionsSince(db, now - 50_000);
    strictEqual(results.length, 1);
  });
});

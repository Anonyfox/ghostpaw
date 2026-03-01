import { ok, strictEqual } from "node:assert";
import { beforeEach, describe, it } from "node:test";
import type { DatabaseHandle } from "../../lib/index.ts";
import { openTestDatabase } from "../../lib/index.ts";
import { createSoul } from "./create_soul.ts";
import { getSoul } from "./get_soul.ts";
import { initSoulsTables } from "./schema.ts";

let db: DatabaseHandle;

describe("getSoul", () => {
  beforeEach(async () => {
    db = await openTestDatabase();
    initSoulsTables(db);
  });

  it("returns the soul by ID when it exists", () => {
    const created = createSoul(db, {
      name: "Ghostpaw",
      essence: "Coordinator.",
    });
    const soul = getSoul(db, created.id);
    ok(soul);
    strictEqual(soul!.id, created.id);
    strictEqual(soul!.name, "Ghostpaw");
    strictEqual(soul!.essence, "Coordinator.");
  });

  it("returns null when the soul does not exist", () => {
    strictEqual(getSoul(db, 999), null);
  });

  it("returns soft-deleted souls (getSoul does not filter by deletion status)", () => {
    const created = createSoul(db, { name: "Archived", essence: "" });
    db.prepare("UPDATE souls SET deleted_at = ? WHERE id = ?").run(Date.now(), created.id);
    const soul = getSoul(db, created.id);
    ok(soul);
    ok(soul!.deletedAt != null);
  });
});

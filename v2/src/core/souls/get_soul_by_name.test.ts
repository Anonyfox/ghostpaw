import { ok, strictEqual } from "node:assert";
import { beforeEach, describe, it } from "node:test";
import type { DatabaseHandle } from "../../lib/index.ts";
import { openTestDatabase } from "../../lib/index.ts";
import { createSoul } from "./create_soul.ts";
import { getSoulByName } from "./get_soul_by_name.ts";
import { initSoulsTables } from "./schema.ts";

let db: DatabaseHandle;

describe("getSoulByName", () => {
  beforeEach(async () => {
    db = await openTestDatabase();
    initSoulsTables(db);
  });

  it("returns the active soul by name", () => {
    const created = createSoul(db, { name: "Ghostpaw", essence: "e" });
    const soul = getSoulByName(db, "Ghostpaw");
    ok(soul);
    strictEqual(soul!.id, created.id);
    strictEqual(soul!.name, "Ghostpaw");
  });

  it("returns null for non-existent name", () => {
    strictEqual(getSoulByName(db, "Nonexistent"), null);
  });

  it("returns null for soft-deleted soul", () => {
    const created = createSoul(db, { name: "Deleted", essence: "" });
    db.prepare("UPDATE souls SET deleted_at = ? WHERE id = ?").run(Date.now(), created.id);
    strictEqual(getSoulByName(db, "Deleted"), null);
  });
});

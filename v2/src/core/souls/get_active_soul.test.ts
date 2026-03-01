import { strictEqual, throws } from "node:assert";
import { beforeEach, describe, it } from "node:test";
import type { DatabaseHandle } from "../../lib/index.ts";
import { openTestDatabase } from "../../lib/index.ts";
import { createSoul } from "./create_soul.ts";
import { getActiveSoul } from "./get_active_soul.ts";
import { initSoulsTables } from "./schema.ts";

let db: DatabaseHandle;

describe("getActiveSoul", () => {
  beforeEach(async () => {
    db = await openTestDatabase();
    initSoulsTables(db);
  });

  it("returns the soul when it exists and is active", () => {
    const created = createSoul(db, { name: "Active", essence: "" });
    const soul = getActiveSoul(db, created.id);
    strictEqual(soul.id, created.id);
    strictEqual(soul.name, "Active");
  });

  it("throws when soul does not exist", () => {
    throws(() => getActiveSoul(db, 999), /not found/i);
  });

  it("throws when soul is archived", () => {
    const created = createSoul(db, { name: "Archived", essence: "" });
    db.prepare("UPDATE souls SET deleted_at = ? WHERE id = ?").run(Date.now(), created.id);
    throws(() => getActiveSoul(db, created.id), /archived/i);
  });
});

import { ok, strictEqual, throws } from "node:assert";
import { beforeEach, describe, it } from "node:test";
import type { DatabaseHandle } from "../../lib/index.ts";
import { openTestDatabase } from "../../lib/index.ts";
import { createSoul } from "./create_soul.ts";
import { initSoulsTables } from "./schema.ts";
import { updateSoul } from "./update_soul.ts";

let db: DatabaseHandle;
let soulId: number;

describe("updateSoul", () => {
  beforeEach(async () => {
    db = await openTestDatabase();
    initSoulsTables(db);
    const soul = createSoul(db, { name: "Test", essence: "Original" });
    soulId = soul.id;
  });

  it("updates essence only", () => {
    const soul = updateSoul(db, soulId, { essence: "Updated" });
    strictEqual(soul.essence, "Updated");
    strictEqual(soul.name, "Test");
  });

  it("updates name", () => {
    const soul = updateSoul(db, soulId, { name: "New Name" });
    strictEqual(soul.name, "New Name");
    strictEqual(soul.essence, "Original");
  });

  it("rejects duplicate active name on update", () => {
    createSoul(db, { name: "Other", essence: "" });
    throws(() => updateSoul(db, soulId, { name: "Other" }));
  });

  it("updates all fields at once", () => {
    const soul = updateSoul(db, soulId, {
      name: "Renamed",
      essence: "New",
    });
    strictEqual(soul.name, "Renamed");
    strictEqual(soul.essence, "New");
  });

  it("updates the timestamp", () => {
    const before = updateSoul(db, soulId, { essence: "v1" });
    const after = updateSoul(db, soulId, { essence: "v2" });
    ok(after.updatedAt >= before.updatedAt);
  });

  it("throws when soul does not exist", () => {
    throws(() => updateSoul(db, 999, { essence: "x" }), /not found/i);
  });

  it("throws when soul is archived", () => {
    db.prepare("UPDATE souls SET deleted_at = ? WHERE id = ?").run(Date.now(), soulId);
    throws(() => updateSoul(db, soulId, { essence: "x" }), /archived/i);
  });

  it("updates description only", () => {
    const soul = updateSoul(db, soulId, { description: "A new description." });
    strictEqual(soul.description, "A new description.");
    strictEqual(soul.essence, "Original");
  });

  it("allows setting description to empty string", () => {
    updateSoul(db, soulId, { description: "temp" });
    const soul = updateSoul(db, soulId, { description: "" });
    strictEqual(soul.description, "");
  });

  it("throws when no fields are provided", () => {
    throws(() => updateSoul(db, soulId, {}), /at least one/i);
  });

  it("throws on empty name", () => {
    throws(() => updateSoul(db, soulId, { name: "  " }), /not be empty/i);
  });

  it("allows setting essence to empty string", () => {
    const soul = updateSoul(db, soulId, { essence: "" });
    strictEqual(soul.essence, "");
  });

  it("treats null name as not provided", () => {
    const soul = updateSoul(db, soulId, { name: null as unknown as string, essence: "new" });
    strictEqual(soul.name, "Test");
    strictEqual(soul.essence, "new");
  });

  it("treats null essence as not provided", () => {
    const soul = updateSoul(db, soulId, { name: "New", essence: null as unknown as string });
    strictEqual(soul.name, "New");
    strictEqual(soul.essence, "Original");
  });

  it("throws when all fields are null", () => {
    throws(
      () =>
        updateSoul(db, soulId, {
          name: null as unknown as string,
          essence: null as unknown as string,
        }),
      /at least one/i,
    );
  });
});

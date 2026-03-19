import { strictEqual } from "node:assert";
import { beforeEach, describe, it } from "node:test";
import type { DatabaseHandle } from "../../lib/index.ts";
import { openTestDatabase } from "../../lib/index.ts";
import { addTrait } from "./add_trait.ts";
import { createSoul } from "./create_soul.ts";
import { ensureMandatorySouls } from "./ensure_mandatory_souls.ts";
import { getTrait } from "./get_trait.ts";
import { initSoulsTables } from "./schema.ts";

let db: DatabaseHandle;
let soulId: number;

describe("getTrait", () => {
  beforeEach(async () => {
    db = await openTestDatabase();
    initSoulsTables(db);
    ensureMandatorySouls(db);
    const soul = createSoul(db, { name: "Test", essence: "" });
    soulId = soul.id;
  });

  it("returns the trait when it exists", () => {
    const created = addTrait(db, soulId, { principle: "p", provenance: "e" });
    const found = getTrait(db, created.id);
    strictEqual(found?.id, created.id);
    strictEqual(found?.principle, "p");
    strictEqual(found?.soulId, soulId);
  });

  it("returns null when trait does not exist", () => {
    strictEqual(getTrait(db, 99999), null);
  });
});

import assert from "node:assert";
import { afterEach, beforeEach, describe, it } from "node:test";
import { read, write } from "@ghostpaw/souls";
import type { DatabaseHandle } from "../../lib/database_handle.ts";
import { openMemorySoulsDatabase } from "../db/open_souls.ts";
import { bootstrapSouls } from "./bootstrap.ts";

let soulsDb: DatabaseHandle;

beforeEach(() => {
  soulsDb = openMemorySoulsDatabase();
});

afterEach(() => {
  soulsDb.close();
});

describe("bootstrapSouls — first boot", () => {
  it("creates all 4 internal souls and returns their IDs", () => {
    const ids = bootstrapSouls(soulsDb);

    assert.strictEqual(typeof ids.ghostpaw, "number");
    assert.strictEqual(typeof ids.scribe, "number");
    assert.strictEqual(typeof ids.innkeeper, "number");
    assert.strictEqual(typeof ids.mentor, "number");

    assert.ok(ids.ghostpaw > 0);
    assert.ok(ids.scribe > 0);
    assert.ok(ids.innkeeper > 0);
    assert.ok(ids.mentor > 0);
  });

  it("all 4 IDs are distinct", () => {
    const ids = bootstrapSouls(soulsDb);
    const unique = new Set(Object.values(ids));
    assert.strictEqual(unique.size, 4);
  });

  it("created souls have correct slugs", () => {
    const ids = bootstrapSouls(soulsDb);
    // biome-ignore lint/suspicious/noExplicitAny: DatabaseHandle satisfies SoulsDb at runtime
    const ghostpaw = read.getSoul(soulsDb as any, ids.ghostpaw);
    assert.strictEqual(ghostpaw?.slug, "ghostpaw");
    // biome-ignore lint/suspicious/noExplicitAny: DatabaseHandle satisfies SoulsDb at runtime
    const scribe = read.getSoul(soulsDb as any, ids.scribe);
    assert.strictEqual(scribe?.slug, "scribe");
  });

  it("scribe and innkeeper get baseline traits", () => {
    const ids = bootstrapSouls(soulsDb);
    // biome-ignore lint/suspicious/noExplicitAny: DatabaseHandle satisfies SoulsDb at runtime
    const scribeTraits = read.listTraits(soulsDb as any, ids.scribe);
    assert.ok(scribeTraits.length > 0, "scribe should have traits after bootstrap");
    // biome-ignore lint/suspicious/noExplicitAny: DatabaseHandle satisfies SoulsDb at runtime
    const innkeeperTraits = read.listTraits(soulsDb as any, ids.innkeeper);
    assert.ok(innkeeperTraits.length > 0, "innkeeper should have traits after bootstrap");
  });

  it("ghostpaw gets no traits", () => {
    const ids = bootstrapSouls(soulsDb);
    // biome-ignore lint/suspicious/noExplicitAny: DatabaseHandle satisfies SoulsDb at runtime
    const ghostpawTraits = read.listTraits(soulsDb as any, ids.ghostpaw);
    assert.strictEqual(ghostpawTraits.length, 0);
  });
});

describe("bootstrapSouls — idempotency", () => {
  it("second boot returns the same IDs without creating duplicates", () => {
    const ids1 = bootstrapSouls(soulsDb);
    const ids2 = bootstrapSouls(soulsDb);

    assert.strictEqual(ids1.ghostpaw, ids2.ghostpaw);
    assert.strictEqual(ids1.scribe, ids2.scribe);
    assert.strictEqual(ids1.innkeeper, ids2.innkeeper);
    assert.strictEqual(ids1.mentor, ids2.mentor);

    // Total souls in DB should still be exactly 4 after two bootstrap calls
    // biome-ignore lint/suspicious/noExplicitAny: DatabaseHandle satisfies SoulsDb at runtime
    const all = read.listSouls(soulsDb as any);
    assert.strictEqual(all.length, 4);
  });
});

describe("bootstrapSouls — slug anchoring", () => {
  it("resolves by slug even if name was changed after initial bootstrap", () => {
    const ids1 = bootstrapSouls(soulsDb);

    // Simulate a name change on the ghostpaw soul
    // biome-ignore lint/suspicious/noExplicitAny: DatabaseHandle satisfies SoulsDb at runtime
    write.updateSoul(soulsDb as any, ids1.ghostpaw, { name: "GhostpawRenamed" });

    const ids2 = bootstrapSouls(soulsDb);
    assert.strictEqual(ids2.ghostpaw, ids1.ghostpaw, "slug anchor must survive name change");
  });
});

describe("bootstrapSouls — custom soul isolation", () => {
  it("ignores custom souls (no slug) and does not include them in SoulIds", () => {
    // biome-ignore lint/suspicious/noExplicitAny: DatabaseHandle satisfies SoulsDb at runtime
    write.createSoul(soulsDb as any, {
      name: "Expert Agent",
      description: "A custom expert soul",
      essence: "Expert in domain X.",
      slug: null,
    });

    const ids = bootstrapSouls(soulsDb);

    // Custom soul should not appear in any SoulIds slot
    const idValues = Object.values(ids);
    // biome-ignore lint/suspicious/noExplicitAny: DatabaseHandle satisfies SoulsDb at runtime
    const allSouls = read.listSouls(soulsDb as any);
    const customSoul = allSouls.find((s) => s.slug === null);
    assert.ok(customSoul, "custom soul should still exist in DB");
    assert.ok(!idValues.includes(customSoul.id), "custom soul ID must not appear in SoulIds");
  });
});

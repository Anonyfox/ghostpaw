import assert from "node:assert";
import { afterEach, beforeEach, describe, it } from "node:test";
import type { DatabaseHandle } from "../../lib/database_handle.ts";
import { openMemorySoulsDatabase } from "../db/open_souls.ts";
import { bootstrapSouls } from "./bootstrap.ts";
import { renderSoul } from "./render.ts";

let soulsDb: DatabaseHandle;

beforeEach(() => {
  soulsDb = openMemorySoulsDatabase();
});

afterEach(() => {
  soulsDb.close();
});

describe("renderSoul", () => {
  it("returns a non-empty string for a valid soul ID", () => {
    const ids = bootstrapSouls(soulsDb);
    const rendered = renderSoul(soulsDb, ids.ghostpaw);
    assert.strictEqual(typeof rendered, "string");
    assert.ok(rendered.length > 50);
  });

  it("rendered output includes the soul name", () => {
    const ids = bootstrapSouls(soulsDb);
    const rendered = renderSoul(soulsDb, ids.scribe);
    assert.ok(rendered.includes("Scribe"), "rendered soul should include the soul name");
  });

  it("rendered output includes essence content", () => {
    const ids = bootstrapSouls(soulsDb);
    const rendered = renderSoul(soulsDb, ids.ghostpaw);
    assert.ok(rendered.includes("Ghostpaw"), "ghostpaw soul should mention its name");
  });

  it("renders different content for different soul IDs", () => {
    const ids = bootstrapSouls(soulsDb);
    const ghostpaw = renderSoul(soulsDb, ids.ghostpaw);
    const scribe = renderSoul(soulsDb, ids.scribe);
    assert.notStrictEqual(ghostpaw, scribe, "different souls must render different output");
  });

  it("throws or returns empty for an unknown soul ID", () => {
    // The souls package throws SoulsNotFoundError for unknown IDs.
    // We just verify we get a thrown error rather than silent empty string.
    assert.throws(() => renderSoul(soulsDb, 99999));
  });
});

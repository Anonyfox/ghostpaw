import { ok, strictEqual } from "node:assert/strict";
import { afterEach, beforeEach, describe, it } from "node:test";
import { initPackTables } from "../../core/pack/index.ts";
import type { DatabaseHandle } from "../../lib/index.ts";
import { openTestDatabase } from "../../lib/index.ts";
import { createPackTools } from "./index.ts";

describe("createPackTools", () => {
  let db: DatabaseHandle;

  beforeEach(async () => {
    db = await openTestDatabase();
    initPackTables(db);
  });

  afterEach(() => db.close());

  it("returns 4 tools", () => {
    const tools = createPackTools(db);
    strictEqual(tools.length, 4);
  });

  it("returns the expected tool names", () => {
    const tools = createPackTools(db);
    const names = tools.map((t) => t.name).sort();
    strictEqual(names[0], "pack_bond");
    strictEqual(names[1], "pack_meet");
    strictEqual(names[2], "pack_note");
    strictEqual(names[3], "pack_sense");
  });

  it("all tools have descriptions", () => {
    const tools = createPackTools(db);
    for (const tool of tools) {
      ok(tool.description.length > 20, `${tool.name} needs a description`);
    }
  });
});

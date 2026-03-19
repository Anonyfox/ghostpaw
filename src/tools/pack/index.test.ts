import { deepStrictEqual, ok, strictEqual } from "node:assert/strict";
import { afterEach, beforeEach, describe, it } from "node:test";
import { initPackTables } from "../../core/pack/runtime/index.ts";
import type { DatabaseHandle } from "../../lib/index.ts";
import { openTestDatabase } from "../../lib/index.ts";
import { createPackTools } from "./index.ts";

const EXPECTED_TOOL_NAMES = [
  "contact_add",
  "contact_list",
  "contact_lookup",
  "contact_remove",
  "pack_bond",
  "pack_link",
  "pack_meet",
  "pack_merge",
  "pack_note",
  "pack_sense",
];

describe("createPackTools", () => {
  let db: DatabaseHandle;

  beforeEach(async () => {
    db = await openTestDatabase();
    initPackTables(db);
  });

  afterEach(() => db.close());

  it("returns 10 tools", () => {
    const tools = createPackTools(db);
    strictEqual(tools.length, 10);
  });

  it("returns the expected tool names", () => {
    const tools = createPackTools(db);
    const names = tools.map((t) => t.name).sort();
    deepStrictEqual(names, EXPECTED_TOOL_NAMES);
  });

  it("all tools have descriptions", () => {
    const tools = createPackTools(db);
    for (const tool of tools) {
      ok(tool.description.length > 20, `${tool.name} needs a description`);
    }
  });
});

import { ok, strictEqual } from "node:assert";
import { afterEach, beforeEach, describe, it } from "node:test";
import {
  dropSkillFragment,
  initSkillFragmentsTables,
  pendingFragmentCount,
} from "../../core/skills/index.ts";
import type { DatabaseHandle } from "../../lib/index.ts";
import { openTestDatabase } from "../../lib/open_test_database.ts";
import { createAbsorbFragmentTool } from "./absorb_fragment.ts";

let db: DatabaseHandle;

beforeEach(async () => {
  db = await openTestDatabase();
  initSkillFragmentsTables(db);
});

afterEach(() => {
  db.close();
});

describe("absorb_fragment tool", () => {
  it("creates a tool with correct name", () => {
    const tool = createAbsorbFragmentTool(db);
    strictEqual(tool.name, "absorb_fragment");
  });

  it("absorbs a fragment by ID", async () => {
    dropSkillFragment(db, "quest", "q-1", "Test observation");
    strictEqual(pendingFragmentCount(db), 1);

    const tool = createAbsorbFragmentTool(db);
    const ctx = { model: "test", provider: "test" };
    const result = await tool.execute({ args: { fragmentId: 1, skillName: "deploy" }, ctx });
    ok((result as { absorbed: boolean }).absorbed);
    strictEqual(pendingFragmentCount(db), 0);
  });
});

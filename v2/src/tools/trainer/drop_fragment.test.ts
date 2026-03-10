import { strictEqual } from "node:assert";
import { afterEach, beforeEach, describe, it } from "node:test";
import { initSkillFragmentsTables, pendingFragmentCount } from "../../core/skills/index.ts";
import type { DatabaseHandle } from "../../lib/index.ts";
import { openTestDatabase } from "../../lib/open_test_database.ts";
import { createDropFragmentTool } from "./drop_fragment.ts";

let db: DatabaseHandle;

beforeEach(async () => {
  db = await openTestDatabase();
  initSkillFragmentsTables(db);
});

afterEach(() => {
  db.close();
});

describe("drop_fragment tool", () => {
  it("drops a fragment into the database", async () => {
    const tool = createDropFragmentTool(db);
    const ctx = { model: "test", provider: "test" };
    const result = await tool.execute({
      args: { observation: "User prefers explicit return types", domain: "typescript" },
      ctx,
    });
    strictEqual((result as Record<string, unknown>).dropped, true);
    strictEqual(pendingFragmentCount(db), 1);
  });

  it("rejects empty observation", async () => {
    const tool = createDropFragmentTool(db);
    const ctx = { model: "test", provider: "test" };
    const result = await tool.execute({ args: { observation: "" }, ctx });
    strictEqual((result as Record<string, unknown>).error, "observation is required.");
  });
});

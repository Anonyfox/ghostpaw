import { ok, strictEqual } from "node:assert/strict";
import { afterEach, beforeEach, describe, it } from "node:test";
import { getMemory } from "../../core/memory/api/read/index.ts";
import { storeMemory, supersedeMemories } from "../../core/memory/api/write/index.ts";
import { initMemoryTable } from "../../core/memory/runtime/index.ts";
import type { DatabaseHandle } from "../../lib/index.ts";
import { openTestDatabase } from "../../lib/index.ts";
import { createForgetTool } from "./forget.ts";

describe("forget tool", () => {
  let db: DatabaseHandle;
  let execute: (args: Record<string, unknown>) => Promise<unknown>;

  beforeEach(async () => {
    db = await openTestDatabase();
    initMemoryTable(db);
    const tool = createForgetTool(db);
    execute = (args) => tool.execute({ args, ctx: { model: "test", provider: "test" } });
  });

  afterEach(() => db.close());

  it("forgets a memory and returns its claim", async () => {
    const mem = storeMemory(db, "User likes tea", {
      source: "explicit",
    });
    const result = (await execute({ id: mem.id })) as {
      forgotten: { id: number; claim: string };
    };
    strictEqual(result.forgotten.id, mem.id);
    strictEqual(result.forgotten.claim, "User likes tea");

    const after = getMemory(db, mem.id);
    ok(after?.supersededBy !== null);
  });

  it("returns error for nonexistent ID", async () => {
    const result = (await execute({ id: 999 })) as { error: string };
    ok(result.error.includes("not found"));
  });

  it("returns error for already-superseded memory", async () => {
    const mem = storeMemory(db, "Old fact", { source: "explicit" });
    supersedeMemories(db, [mem.id]);
    const result = (await execute({ id: mem.id })) as { error: string };
    ok(result.error.includes("already superseded"));
  });

  it("returns error for non-positive ID", async () => {
    const result = (await execute({ id: 0 })) as { error: string };
    ok(result.error.includes("positive integer"));
  });

  it("returns error for negative ID", async () => {
    const result = (await execute({ id: -5 })) as { error: string };
    ok(result.error.includes("positive integer"));
  });

  it("returns error for float ID", async () => {
    const result = (await execute({ id: 1.5 })) as { error: string };
    ok(result.error.includes("positive integer"));
  });

  it("has a tool name and description", () => {
    const tool = createForgetTool(db);
    strictEqual(tool.name, "forget");
    ok(tool.description.length > 20);
  });
});

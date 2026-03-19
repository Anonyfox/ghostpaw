import { deepStrictEqual, ok, strictEqual } from "node:assert/strict";
import { afterEach, beforeEach, describe, it } from "node:test";
import { storeMemory } from "../../core/memory/api/write/index.ts";
import { initMemoryTable } from "../../core/memory/runtime/index.ts";
import type { DatabaseHandle } from "../../lib/index.ts";
import { openTestDatabase } from "../../lib/index.ts";
import { createRecallTool } from "./recall.ts";
import type { FormattedMemory } from "./types.ts";

describe("recall tool", () => {
  let db: DatabaseHandle;
  let execute: (args: Record<string, string>) => Promise<unknown>;

  beforeEach(async () => {
    db = await openTestDatabase();
    initMemoryTable(db);
    const tool = createRecallTool(db);
    execute = (args) => tool.execute({ args, ctx: { model: "test", provider: "test" } });
  });

  afterEach(() => db.close());

  it("finds a relevant memory", async () => {
    storeMemory(db, "The user loves pizza", { source: "explicit" });
    const result = (await execute({ query: "pizza" })) as { memories: FormattedMemory[] };
    ok(result.memories.length > 0);
    ok(result.memories[0].claim.includes("pizza"));
  });

  it("returns empty array with note when nothing matches", async () => {
    const result = (await execute({ query: "quantum entanglement" })) as {
      memories: FormattedMemory[];
      note: string;
    };
    deepStrictEqual(result.memories, []);
    strictEqual(result.note, "No relevant memories found.");
  });

  it("returns error for empty query", async () => {
    const result = (await execute({ query: "" })) as { error: string };
    ok(result.error);
  });

  it("returns error for whitespace-only query", async () => {
    const result = (await execute({ query: "   " })) as { error: string };
    ok(result.error);
  });

  it("results are formatted correctly", async () => {
    storeMemory(db, "The user prefers dark mode", {
      source: "observed",
      category: "preference",
    });
    const result = (await execute({ query: "dark mode" })) as { memories: FormattedMemory[] };
    ok(result.memories.length > 0);
    const mem = result.memories[0];
    strictEqual(typeof mem.id, "number");
    strictEqual(typeof mem.claim, "string");
    strictEqual(typeof mem.strength, "string");
    strictEqual(typeof mem.confidence, "number");
    strictEqual(typeof mem.evidence, "number");
    strictEqual(typeof mem.source, "string");
    strictEqual(typeof mem.category, "string");
    strictEqual(typeof mem.last_verified, "string");
    strictEqual(typeof mem.similarity, "number");
  });

  it("respects ranking order", async () => {
    storeMemory(db, "The user loves Italian food", {
      source: "explicit",
    });
    storeMemory(db, "The user owns a blue car", {
      source: "inferred",
    });
    storeMemory(db, "Italian restaurants are the best", { source: "observed" });
    const result = (await execute({ query: "Italian food preferences" })) as {
      memories: FormattedMemory[];
    };
    ok(result.memories.length >= 2);
    ok(result.memories[0].similarity! >= result.memories[1].similarity!);
  });

  it("has a tool name and description", () => {
    const tool = createRecallTool(db);
    strictEqual(tool.name, "recall");
    ok(tool.description.length > 20);
  });
});

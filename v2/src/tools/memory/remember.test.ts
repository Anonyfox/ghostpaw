import { ok, strictEqual } from "node:assert/strict";
import { afterEach, beforeEach, describe, it } from "node:test";
import { embedText, initMemoryTable, storeMemory } from "../../core/memory/index.ts";
import type { DatabaseHandle } from "../../lib/index.ts";
import { openTestDatabase } from "../../lib/index.ts";
import { createRememberTool } from "./remember.ts";
import type { FormattedMemory } from "./types.ts";

describe("remember tool", () => {
  let db: DatabaseHandle;
  let execute: (args: Record<string, unknown>) => Promise<unknown>;

  beforeEach(async () => {
    db = await openTestDatabase();
    initMemoryTable(db);
    const tool = createRememberTool(db);
    execute = (args) => tool.execute({ args, ctx: { model: "test", provider: "test" } });
  });

  afterEach(() => db.close());

  it("stores and returns a formatted memory", async () => {
    const result = (await execute({ claim: "User likes cats" })) as {
      stored: FormattedMemory;
      similar: FormattedMemory[];
    };
    strictEqual(result.stored.claim, "User likes cats");
    strictEqual(typeof result.stored.id, "number");
    strictEqual(result.stored.source, "explicit");
    ok(result.stored.confidence > 0);
  });

  it("surfaces similar existing memories", async () => {
    storeMemory(db, "User likes cats a lot", embedText("User likes cats a lot"), {
      source: "explicit",
    });
    const result = (await execute({ claim: "User likes cats" })) as {
      stored: FormattedMemory;
      similar: FormattedMemory[];
    };
    ok(result.similar.length > 0);
    ok(result.similar[0].claim.includes("cats"));
  });

  it("excludes the just-stored memory from similar list", async () => {
    const result = (await execute({ claim: "User speaks French" })) as {
      stored: FormattedMemory;
      similar: FormattedMemory[];
    };
    const ids = result.similar.map((m) => m.id);
    ok(!ids.includes(result.stored.id));
  });

  it("returns error for empty claim", async () => {
    const result = (await execute({ claim: "" })) as { error: string };
    ok(result.error);
  });

  it("returns error for whitespace-only claim", async () => {
    const result = (await execute({ claim: "   " })) as { error: string };
    ok(result.error);
  });

  it("passes source through correctly", async () => {
    const result = (await execute({
      claim: "Observed behavior",
      source: "observed",
    })) as { stored: FormattedMemory };
    strictEqual(result.stored.source, "observed");
  });

  it("passes category through correctly", async () => {
    const result = (await execute({
      claim: "User prefers vim",
      category: "preference",
    })) as { stored: FormattedMemory };
    strictEqual(result.stored.category, "preference");
  });

  it("defaults source to explicit", async () => {
    const result = (await execute({ claim: "Default source test" })) as {
      stored: FormattedMemory;
    };
    strictEqual(result.stored.source, "explicit");
  });

  it("defaults category to custom", async () => {
    const result = (await execute({ claim: "Default category test" })) as {
      stored: FormattedMemory;
    };
    strictEqual(result.stored.category, "custom");
  });

  it("has a tool name and description", () => {
    const tool = createRememberTool(db);
    strictEqual(tool.name, "remember");
    ok(tool.description.length > 20);
  });
});

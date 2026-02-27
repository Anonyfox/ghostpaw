import { ok, strictEqual } from "node:assert/strict";
import { afterEach, beforeEach, describe, it } from "node:test";
import {
  embedText,
  getMemory,
  initMemoryTable,
  storeMemory,
  supersedeMemories,
} from "../../core/memory/index.ts";
import type { DatabaseHandle } from "../../lib/index.ts";
import { openTestDatabase } from "../../lib/index.ts";
import { createReviseTool } from "./revise.ts";
import type { FormattedMemory } from "./types.ts";

describe("revise tool", () => {
  let db: DatabaseHandle;
  let execute: (args: Record<string, unknown>) => Promise<unknown>;

  beforeEach(async () => {
    db = await openTestDatabase();
    initMemoryTable(db);
    const tool = createReviseTool(db);
    execute = (args) => tool.execute({ args, ctx: { model: "test", provider: "test" } });
  });

  afterEach(() => db.close());

  it("corrects a single memory (one ID + claim)", async () => {
    const old = storeMemory(db, "User likes pizza", embedText("User likes pizza"), {
      source: "explicit",
    });
    const result = (await execute({
      ids: String(old.id),
      claim: "User loves sushi now",
    })) as { created: FormattedMemory; superseded: { id: number; claim: string }[] };

    strictEqual(result.created.claim, "User loves sushi now");
    strictEqual(result.superseded.length, 1);
    strictEqual(result.superseded[0].id, old.id);
    strictEqual(result.superseded[0].claim, "User likes pizza");

    const afterOld = getMemory(db, old.id);
    ok(afterOld?.supersededBy === result.created.id);
  });

  it("merges multiple memories (multiple IDs + claim)", async () => {
    const m1 = storeMemory(db, "User likes Italian food", embedText("User likes Italian food"), {
      source: "explicit",
    });
    const m2 = storeMemory(db, "User enjoys pasta dishes", embedText("User enjoys pasta dishes"), {
      source: "observed",
    });
    const result = (await execute({
      ids: `${m1.id},${m2.id}`,
      claim: "User loves Italian cuisine, especially pasta",
    })) as { created: FormattedMemory; superseded: { id: number; claim: string }[] };

    strictEqual(result.created.claim, "User loves Italian cuisine, especially pasta");
    strictEqual(result.superseded.length, 2);

    ok(getMemory(db, m1.id)?.supersededBy === result.created.id);
    ok(getMemory(db, m2.id)?.supersededBy === result.created.id);
  });

  it("confirms a single memory (one ID, no claim)", async () => {
    const mem = storeMemory(db, "User works remotely", embedText("User works remotely"), {
      source: "explicit",
    });
    const result = (await execute({ ids: String(mem.id) })) as {
      confirmed: {
        id: number;
        claim: string;
        confidence_before: number;
        confidence_after: number;
        evidence: number;
      };
    };
    strictEqual(result.confirmed.id, mem.id);
    strictEqual(result.confirmed.claim, "User works remotely");
    ok(result.confirmed.confidence_after > result.confirmed.confidence_before);
    strictEqual(result.confirmed.evidence, 2);
  });

  it("bumps confidence on confirm", async () => {
    const mem = storeMemory(db, "User is a developer", embedText("User is a developer"), {
      source: "inferred",
      confidence: 0.5,
    });
    const result = (await execute({ ids: String(mem.id) })) as {
      confirmed: { confidence_before: number; confidence_after: number };
    };
    ok(result.confirmed.confidence_after > 0.5);
  });

  it("returns error for multiple IDs without claim", async () => {
    const m1 = storeMemory(db, "Fact A", embedText("Fact A"), { source: "explicit" });
    const m2 = storeMemory(db, "Fact B", embedText("Fact B"), { source: "explicit" });
    const result = (await execute({ ids: `${m1.id},${m2.id}` })) as { error: string };
    ok(result.error.includes("claim"));
  });

  it("returns error for nonexistent ID in correct mode", async () => {
    const result = (await execute({ ids: "999", claim: "New claim" })) as { error: string };
    ok(result.error.includes("not found"));
  });

  it("returns error for nonexistent ID in confirm mode", async () => {
    const result = (await execute({ ids: "999" })) as { error: string };
    ok(result.error.includes("not found"));
  });

  it("returns error for already-superseded ID in correct mode", async () => {
    const mem = storeMemory(db, "Old fact", embedText("Old fact"), { source: "explicit" });
    supersedeMemories(db, [mem.id]);
    const result = (await execute({
      ids: String(mem.id),
      claim: "Updated fact",
    })) as { error: string };
    ok(result.error.includes("superseded"));
  });

  it("returns error for already-superseded ID in confirm mode", async () => {
    const mem = storeMemory(db, "Old fact", embedText("Old fact"), { source: "explicit" });
    supersedeMemories(db, [mem.id]);
    const result = (await execute({ ids: String(mem.id) })) as { error: string };
    ok(result.error.includes("superseded"));
  });

  it("returns error for malformed IDs string", async () => {
    const result = (await execute({ ids: "abc,xyz" })) as { error: string };
    ok(result.error.includes("Invalid ID"));
  });

  it("returns error for float ID in string", async () => {
    const result = (await execute({ ids: "1.5", claim: "test" })) as { error: string };
    ok(result.error.includes("Invalid ID"));
  });

  it("deduplicates repeated IDs", async () => {
    const mem = storeMemory(db, "Duplicate test", embedText("Duplicate test"), {
      source: "explicit",
    });
    const result = (await execute({
      ids: `${mem.id},${mem.id}`,
      claim: "Deduplicated",
    })) as { created: FormattedMemory; superseded: { id: number; claim: string }[] };
    strictEqual(result.superseded.length, 1);
    strictEqual(result.created.claim, "Deduplicated");
  });

  it("returns error for empty IDs string", async () => {
    const result = (await execute({ ids: "" })) as { error: string };
    ok(result.error);
  });

  it("handles IDs with extra whitespace", async () => {
    const mem = storeMemory(db, "Some fact", embedText("Some fact"), { source: "explicit" });
    const result = (await execute({
      ids: ` ${mem.id} `,
      claim: "Updated fact",
    })) as { created: FormattedMemory };
    strictEqual(result.created.claim, "Updated fact");
  });

  it("has a tool name and description", () => {
    const tool = createReviseTool(db);
    strictEqual(tool.name, "revise");
    ok(tool.description.length > 20);
  });
});

import { deepStrictEqual, ok, strictEqual } from "node:assert";
import { afterEach, beforeEach, describe, it } from "node:test";
import { initChatTables, createSession } from "../core/chat/index.ts";
import { initHauntTables, storeHaunt } from "../core/haunt/index.ts";
import type { DatabaseHandle } from "../lib/index.ts";
import { openTestDatabase } from "../lib/index.ts";
import { createRecallHauntsTool } from "./recall_haunts.ts";

let db: DatabaseHandle;
let execute: (args: Record<string, unknown>) => Promise<unknown>;

beforeEach(async () => {
  db = await openTestDatabase();
  initChatTables(db);
  initHauntTables(db);
  const tool = createRecallHauntsTool(db);
  execute = (args) => tool.execute({ args } as never);
});

afterEach(() => {
  db.close();
});

describe("recall_haunts tool", () => {
  it("list returns empty when no haunts exist", async () => {
    const result = (await execute({ action: "list" })) as Record<string, unknown>;
    deepStrictEqual(result.haunts, []);
    ok(result.note);
  });

  it("list returns recent haunt summaries", async () => {
    const s = createSession(db, "haunt:tool:1", { purpose: "haunt" });
    storeHaunt(db, {
      sessionId: s.id as number,
      rawJournal: "full private thoughts",
      summary: "thought about testing",
    });

    const result = (await execute({ action: "list" })) as {
      haunts: { id: number; summary: string; date: string }[];
    };
    strictEqual(result.haunts.length, 1);
    strictEqual(result.haunts[0].summary, "thought about testing");
    ok(result.haunts[0].date);
  });

  it("search finds haunts by keyword", async () => {
    const s1 = createSession(db, "haunt:tool:s1", { purpose: "haunt" });
    const s2 = createSession(db, "haunt:tool:s2", { purpose: "haunt" });
    storeHaunt(db, { sessionId: s1.id as number, rawJournal: "j", summary: "deployment review" });
    storeHaunt(db, { sessionId: s2.id as number, rawJournal: "j", summary: "memory patterns" });

    const result = (await execute({ action: "search", query: "deployment" })) as {
      haunts: { id: number; summary: string }[];
    };
    strictEqual(result.haunts.length, 1);
    strictEqual(result.haunts[0].summary, "deployment review");
  });

  it("search requires a query", async () => {
    const result = (await execute({ action: "search" })) as { error: string };
    ok(result.error);
  });

  it("read returns full journal by id", async () => {
    const s = createSession(db, "haunt:tool:r1", { purpose: "haunt" });
    const haunt = storeHaunt(db, {
      sessionId: s.id as number,
      rawJournal: "deep private reflection about architecture",
      summary: "architecture review",
    });

    const result = (await execute({ action: "read", id: haunt.id })) as {
      journal: string;
      summary: string;
    };
    strictEqual(result.journal, "deep private reflection about architecture");
    strictEqual(result.summary, "architecture review");
  });

  it("read returns error for nonexistent id", async () => {
    const result = (await execute({ action: "read", id: 999 })) as { error: string };
    ok(result.error);
  });

  it("read requires a valid id", async () => {
    const result = (await execute({ action: "read" })) as { error: string };
    ok(result.error);
  });
});

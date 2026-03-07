import { ok, strictEqual } from "node:assert";
import { afterEach, beforeEach, describe, it } from "node:test";
import { addMessage, createSession, initChatTables, renameSession } from "../core/chat/index.ts";
import type { DatabaseHandle } from "../lib/index.ts";
import { openTestDatabase } from "../lib/index.ts";
import { createRecallHauntsTool } from "./recall_haunts.ts";

interface HauntSummary {
  id: number;
  summary: string;
  date: string;
}

interface HauntListResult {
  haunts: HauntSummary[];
  note?: string;
}

interface HauntReadResult {
  id: number;
  journal: string;
  summary: string;
  date: string;
}

interface ErrorResult {
  error: string;
}

let db: DatabaseHandle;
let execute: (args: Record<string, unknown>) => Promise<unknown>;

beforeEach(async () => {
  db = await openTestDatabase();
  initChatTables(db);
  const tool = createRecallHauntsTool(db);
  execute = (args) => tool.execute({ args } as never);
});

afterEach(() => {
  db.close();
});

function createHauntSession(summary: string, journal: string): number {
  const s = createSession(db, `haunt:test:${Date.now()}:${Math.random()}`, { purpose: "haunt" });
  const id = s.id as number;
  renameSession(db, id, summary);
  addMessage(db, { sessionId: id, role: "assistant", content: journal });
  return id;
}

describe("recall_haunts tool", () => {
  it("list returns empty when no haunts exist", async () => {
    const result = (await execute({ action: "list" })) as HauntListResult;
    ok(result.haunts);
    strictEqual(result.haunts.length, 0);
  });

  it("list returns recent haunt summaries", async () => {
    createHauntSession("Explored MCP", "I looked at MCP servers...");
    createHauntSession("Reviewed memory", "Memory system analysis...");

    const result = (await execute({ action: "list" })) as HauntListResult;
    strictEqual(result.haunts.length, 2);
    ok(result.haunts.some((h) => h.summary === "Explored MCP"));
    ok(result.haunts.some((h) => h.summary === "Reviewed memory"));
  });

  it("search finds haunts by keyword in display_name", async () => {
    createHauntSession("Explored MCP protocols", "MCP exploration...");
    createHauntSession("Reviewed memory system", "Memory review...");

    const result = (await execute({ action: "search", query: "MCP" })) as HauntListResult;
    strictEqual(result.haunts.length, 1);
    ok(result.haunts[0].summary.includes("MCP"));
  });

  it("search returns error for empty query", async () => {
    const result = (await execute({ action: "search", query: "" })) as ErrorResult;
    ok(result.error);
  });

  it("read returns the full journal from session messages", async () => {
    const id = createHauntSession("Explored MCP", "The full journal content here.");

    const result = (await execute({ action: "read", id })) as HauntReadResult;
    strictEqual(result.id, id);
    ok(result.journal.includes("The full journal content here."));
    strictEqual(result.summary, "Explored MCP");
  });

  it("read returns error for non-existent haunt", async () => {
    const result = (await execute({ action: "read", id: 9999 })) as ErrorResult;
    ok(result.error);
  });

  it("read returns error for invalid id", async () => {
    const result = (await execute({ action: "read", id: -1 })) as ErrorResult;
    ok(result.error);
  });
});

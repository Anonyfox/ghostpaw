import { strictEqual } from "node:assert";
import { afterEach, beforeEach, describe, it } from "node:test";
import type { DatabaseHandle } from "../../lib/index.ts";
import { openTestDatabase } from "../../lib/index.ts";
import { createSession } from "../chat/create_session.ts";
import { initChatTables } from "../chat/schema.ts";
import { createRun } from "./create_run.ts";
import { recordRunUsage } from "./record_usage.ts";
import { initRunsTable } from "./schema.ts";

let db: DatabaseHandle;

beforeEach(async () => {
  db = await openTestDatabase();
  initChatTables(db);
  initRunsTable(db);
});

afterEach(() => {
  db.close();
});

describe("recordRunUsage", () => {
  it("updates tokens and cost", () => {
    const session = createSession(db, "p");
    const run = createRun(db, {
      parentSessionId: session.id as number,
      model: "gpt-4o",
      task: "t",
    });
    recordRunUsage(db, run.id, {
      tokensIn: 500,
      tokensOut: 200,
      reasoningTokens: 30,
      cachedTokens: 100,
      costUsd: 0.015,
    });
    const row = db.prepare("SELECT * FROM delegation_runs WHERE id = ?").get(run.id);
    strictEqual(row!.tokens_in, 500);
    strictEqual(row!.tokens_out, 200);
    strictEqual(row!.reasoning_tokens, 30);
    strictEqual(row!.cached_tokens, 100);
    strictEqual(row!.cost_usd, 0.015);
  });
});

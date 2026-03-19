import { strictEqual } from "node:assert";
import { afterEach, beforeEach, describe, it } from "node:test";
import type { DatabaseHandle } from "../../lib/index.ts";
import { openTestDatabase } from "../../lib/index.ts";
import { accumulateUsage } from "./accumulate_usage.ts";
import { createSession } from "./create_session.ts";
import { getSession } from "./get_session.ts";
import { initChatTables } from "./schema.ts";

let db: DatabaseHandle;

beforeEach(async () => {
  db = await openTestDatabase();
  initChatTables(db);
});

afterEach(() => {
  db.close();
});

describe("accumulateUsage", () => {
  it("increments all session counters", () => {
    const session = createSession(db, "k");
    accumulateUsage(db, session.id, {
      tokensIn: 100,
      tokensOut: 50,
      reasoningTokens: 10,
      cachedTokens: 20,
      costUsd: 0.005,
    });
    const updated = getSession(db, session.id)!;
    strictEqual(updated.tokensIn, 100);
    strictEqual(updated.tokensOut, 50);
    strictEqual(updated.reasoningTokens, 10);
    strictEqual(updated.cachedTokens, 20);
    strictEqual(updated.costUsd, 0.005);
  });

  it("accumulates across multiple calls", () => {
    const session = createSession(db, "k");
    const delta = {
      tokensIn: 50,
      tokensOut: 25,
      reasoningTokens: 5,
      cachedTokens: 10,
      costUsd: 0.001,
    };
    accumulateUsage(db, session.id, delta);
    accumulateUsage(db, session.id, delta);
    accumulateUsage(db, session.id, delta);
    const updated = getSession(db, session.id)!;
    strictEqual(updated.tokensIn, 150);
    strictEqual(updated.tokensOut, 75);
    strictEqual(updated.reasoningTokens, 15);
    strictEqual(updated.cachedTokens, 30);
    strictEqual(updated.costUsd, 0.003);
  });
});

import { ok, strictEqual } from "node:assert";
import { afterEach, beforeEach, describe, it } from "node:test";
import type { DatabaseHandle } from "../../lib/index.ts";
import { openTestDatabase } from "../../lib/index.ts";
import { createSession } from "./create_session.ts";
import { finalizeDelegation } from "./finalize_delegation.ts";
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

describe("finalizeDelegation", () => {
  it("accumulates usage on parent and closes child", () => {
    const parent = createSession(db, "parent");
    const child = createSession(db, "delegate:1", {
      purpose: "delegate",
      parentSessionId: parent.id,
    });

    finalizeDelegation(db, parent.id, child.id, {
      tokensIn: 100,
      tokensOut: 50,
      reasoningTokens: 10,
      cachedTokens: 5,
      costUsd: 0.01,
    });

    const updatedParent = getSession(db, parent.id)!;
    strictEqual(updatedParent.tokensIn, 100);
    strictEqual(updatedParent.tokensOut, 50);
    strictEqual(updatedParent.reasoningTokens, 10);
    strictEqual(updatedParent.cachedTokens, 5);
    strictEqual(updatedParent.costUsd, 0.01);

    const updatedChild = getSession(db, child.id)!;
    ok(updatedChild.closedAt !== null);
    strictEqual(updatedChild.error, null);
  });

  it("stores error on child when provided", () => {
    const parent = createSession(db, "parent");
    const child = createSession(db, "delegate:1", {
      purpose: "delegate",
      parentSessionId: parent.id,
    });

    finalizeDelegation(
      db,
      parent.id,
      child.id,
      { tokensIn: 0, tokensOut: 0, reasoningTokens: 0, cachedTokens: 0, costUsd: 0 },
      "something went wrong",
    );

    const updatedChild = getSession(db, child.id)!;
    strictEqual(updatedChild.error, "something went wrong");
    ok(updatedChild.closedAt !== null);
  });

  it("accumulates usage additively across multiple calls", () => {
    const parent = createSession(db, "parent");
    const c1 = createSession(db, "delegate:1", {
      purpose: "delegate",
      parentSessionId: parent.id,
    });
    const c2 = createSession(db, "delegate:2", {
      purpose: "delegate",
      parentSessionId: parent.id,
    });

    finalizeDelegation(db, parent.id, c1.id, {
      tokensIn: 100,
      tokensOut: 50,
      reasoningTokens: 0,
      cachedTokens: 0,
      costUsd: 0.01,
    });
    finalizeDelegation(db, parent.id, c2.id, {
      tokensIn: 200,
      tokensOut: 100,
      reasoningTokens: 0,
      cachedTokens: 0,
      costUsd: 0.02,
    });

    const updatedParent = getSession(db, parent.id)!;
    strictEqual(updatedParent.tokensIn, 300);
    strictEqual(updatedParent.tokensOut, 150);
    strictEqual(updatedParent.costUsd, 0.03);
  });
});

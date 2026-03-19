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
  it("closes the child session without mutating the parent totals", () => {
    const parent = createSession(db, "parent");
    const child = createSession(db, "delegate:1", {
      purpose: "delegate",
      parentSessionId: parent.id,
    });

    finalizeDelegation(db, child.id);

    const updatedParent = getSession(db, parent.id)!;
    strictEqual(updatedParent.tokensIn, 0);
    strictEqual(updatedParent.tokensOut, 0);
    strictEqual(updatedParent.reasoningTokens, 0);
    strictEqual(updatedParent.cachedTokens, 0);
    strictEqual(updatedParent.costUsd, 0);

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

    finalizeDelegation(db, child.id, "something went wrong");

    const updatedChild = getSession(db, child.id)!;
    strictEqual(updatedChild.error, "something went wrong");
    ok(updatedChild.closedAt !== null);
  });

  it("closes multiple child sessions independently", () => {
    const parent = createSession(db, "parent");
    const c1 = createSession(db, "delegate:1", {
      purpose: "delegate",
      parentSessionId: parent.id,
    });
    const c2 = createSession(db, "delegate:2", {
      purpose: "delegate",
      parentSessionId: parent.id,
    });

    finalizeDelegation(db, c1.id);
    finalizeDelegation(db, c2.id);

    const updatedParent = getSession(db, parent.id)!;
    strictEqual(updatedParent.tokensIn, 0);
    strictEqual(updatedParent.tokensOut, 0);
    strictEqual(updatedParent.costUsd, 0);
    ok(getSession(db, c1.id)!.closedAt !== null);
    ok(getSession(db, c2.id)!.closedAt !== null);
  });
});

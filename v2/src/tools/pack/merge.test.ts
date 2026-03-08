import { ok, strictEqual } from "node:assert/strict";
import { afterEach, beforeEach, describe, it } from "node:test";
import {
  addContact,
  getMember,
  initPackTables,
  meetMember,
  noteInteraction,
  setField,
} from "../../core/pack/index.ts";
import type { DatabaseHandle } from "../../lib/index.ts";
import { openTestDatabase } from "../../lib/index.ts";
import { createPackMergeTool } from "./merge.ts";

describe("pack_merge tool", () => {
  let db: DatabaseHandle;
  let execute: (args: Record<string, unknown>) => Promise<unknown>;

  beforeEach(async () => {
    db = await openTestDatabase();
    initPackTables(db);
    const tool = createPackMergeTool(db);
    execute = (args) => tool.execute({ args, ctx: { model: "test", provider: "test" } });
  });

  afterEach(() => db.close());

  it("merges two members and returns result", async () => {
    meetMember(db, { name: "Alice", kind: "human" });
    const b = meetMember(db, { name: "Alice W.", kind: "human" });
    noteInteraction(db, { memberId: b.id, kind: "conversation", summary: "test" });
    addContact(db, { memberId: b.id, type: "email", value: "b@test.com" });
    setField(db, b.id, "vip");

    const result = (await execute({ keep: "Alice", merge: "Alice W." })) as {
      merged: boolean;
      kept: { name: string };
      lost: { name: string };
    };
    strictEqual(result.merged, true);
    strictEqual(result.kept.name, "Alice");
    strictEqual(result.lost.name, "Alice W.");
    strictEqual(getMember(db, b.id)?.status, "lost");
  });

  it("returns error for unknown keep member", async () => {
    meetMember(db, { name: "Alice", kind: "human" });
    const result = (await execute({ keep: "Ghost", merge: "Alice" })) as { error: string };
    ok(result.error.includes("not found"));
  });

  it("returns error for unknown merge member", async () => {
    meetMember(db, { name: "Alice", kind: "human" });
    const result = (await execute({ keep: "Alice", merge: "Ghost" })) as { error: string };
    ok(result.error.includes("not found"));
  });

  it("returns error when merging same member", async () => {
    meetMember(db, { name: "Alice", kind: "human" });
    const result = (await execute({ keep: "Alice", merge: "Alice" })) as { error: string };
    ok(result.error.includes("itself"));
  });
});

import { ok, strictEqual } from "node:assert/strict";
import { afterEach, beforeEach, describe, it } from "node:test";
import { meetMember } from "../../core/pack/api/write/index.ts";
import { initPackTables } from "../../core/pack/runtime/index.ts";
import type { DatabaseHandle } from "../../lib/index.ts";
import { openTestDatabase } from "../../lib/index.ts";
import { resolveMember } from "./resolve.ts";

describe("resolveMember", () => {
  let db: DatabaseHandle;

  beforeEach(async () => {
    db = await openTestDatabase();
    initPackTables(db);
    meetMember(db, { name: "Alice", kind: "human" });
  });

  afterEach(() => db.close());

  it("resolves by name", () => {
    const m = resolveMember(db, "Alice");
    ok(m);
    strictEqual(m.name, "Alice");
  });

  it("resolves by numeric ID", () => {
    const m = resolveMember(db, "1");
    ok(m);
    strictEqual(m.name, "Alice");
  });

  it("returns null for empty string", () => {
    strictEqual(resolveMember(db, ""), null);
  });

  it("returns null for whitespace", () => {
    strictEqual(resolveMember(db, "   "), null);
  });

  it("returns null for unknown name", () => {
    strictEqual(resolveMember(db, "Bob"), null);
  });

  it("returns null for non-existent ID", () => {
    strictEqual(resolveMember(db, "999"), null);
  });

  it("trims whitespace around name", () => {
    const m = resolveMember(db, "  Alice  ");
    ok(m);
    strictEqual(m.name, "Alice");
  });
});

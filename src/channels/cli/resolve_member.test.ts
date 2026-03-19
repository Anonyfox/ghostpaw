import { strictEqual } from "node:assert";
import { beforeEach, describe, it } from "node:test";
import { meetMember } from "../../core/pack/api/write/index.ts";
import { initPackTables } from "../../core/pack/runtime/index.ts";
import { type DatabaseHandle, openTestDatabase } from "../../lib/index.ts";
import { resolveMember } from "./resolve_member.ts";

let db: DatabaseHandle;

beforeEach(async () => {
  db = await openTestDatabase();
  initPackTables(db);
});

describe("resolveMember", () => {
  it("resolves by numeric ID", () => {
    const m = meetMember(db, { name: "Alice", kind: "human" });
    const found = resolveMember(db, String(m.id));
    strictEqual(found?.id, m.id);
    strictEqual(found?.name, "Alice");
  });

  it("resolves by name", () => {
    meetMember(db, { name: "Bob", kind: "agent" });
    const found = resolveMember(db, "Bob");
    strictEqual(found?.name, "Bob");
  });

  it("trims whitespace before resolving", () => {
    meetMember(db, { name: "Carol", kind: "human" });
    strictEqual(resolveMember(db, "  Carol  ")?.name, "Carol");
  });

  it("returns null for empty string", () => {
    strictEqual(resolveMember(db, ""), null);
  });

  it("returns null for nonexistent ID", () => {
    strictEqual(resolveMember(db, "999"), null);
  });

  it("returns null for nonexistent name", () => {
    strictEqual(resolveMember(db, "Nobody"), null);
  });

  it("prefers ID lookup when input is numeric", () => {
    const m = meetMember(db, { name: "42", kind: "human" });
    // ID 1 exists, name "42" also exists -- numeric input resolves as ID
    const found = resolveMember(db, "1");
    strictEqual(found?.id, m.id);
  });

  it("does not find lost members by name", () => {
    const m = meetMember(db, { name: "Lost", kind: "human" });
    db.prepare("UPDATE pack_members SET status = 'lost' WHERE id = ?").run(m.id);
    strictEqual(resolveMember(db, "Lost"), null);
  });

  it("finds lost members by ID", () => {
    const m = meetMember(db, { name: "Lost", kind: "human" });
    db.prepare("UPDATE pack_members SET status = 'lost' WHERE id = ?").run(m.id);
    strictEqual(resolveMember(db, String(m.id))?.status, "lost");
  });
});

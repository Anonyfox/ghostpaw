import assert from "node:assert/strict";
import { beforeEach, describe, it } from "node:test";
import { type DatabaseHandle, openTestDatabase } from "../../lib/index.ts";
import { setField } from "./fields.ts";
import { addLink } from "./links.ts";
import { meetMember } from "./meet_member.ts";
import { previewMergeMember } from "./merge_member_preview.ts";
import { initPackTables } from "./schema.ts";
import { updateBond } from "./update_bond.ts";

let db: DatabaseHandle;

beforeEach(async () => {
  db = await openTestDatabase();
  initPackTables(db);
});

describe("previewMergeMember", () => {
  it("summarizes survivorship choices and conflicts", () => {
    const keep = meetMember(db, { name: "Alice", kind: "human", timezone: "UTC" });
    const merge = meetMember(db, { name: "Alexander", kind: "human", timezone: "Europe/Berlin" });
    db.prepare("UPDATE pack_members SET updated_at = ? WHERE id = ?").run(100, keep.id);
    db.prepare("UPDATE pack_members SET updated_at = ? WHERE id = ?").run(200, merge.id);
    setField(db, keep.id, "client", "yes");
    setField(db, merge.id, "client", "priority");
    db.prepare("UPDATE pack_fields SET updated_at = ? WHERE member_id = ? AND key = ?").run(
      100,
      keep.id,
      "client",
    );
    db.prepare("UPDATE pack_fields SET updated_at = ? WHERE member_id = ? AND key = ?").run(
      200,
      merge.id,
      "client",
    );
    const manager = meetMember(db, { name: "Manager", kind: "human" });
    addLink(db, manager.id, keep.id, "manages");
    addLink(db, manager.id, merge.id, "manages");

    const preview = previewMergeMember(db, keep.id, merge.id);
    const timezoneChoice = preview.memberChoices.find((choice) => choice.field === "timezone");
    assert.strictEqual(timezoneChoice?.chosenSource, "merge");
    assert.strictEqual(preview.fieldConflicts.length, 1);
    assert.strictEqual(preview.fieldConflicts[0].chosenSource, "merge");
    assert.strictEqual(preview.linkConflicts.length, 1);
    assert.strictEqual(preview.linkConflicts[0].resolution, "keep");
  });

  it("rejects previewing invalid merge states", () => {
    const keep = meetMember(db, { name: "Alice", kind: "human" });
    const merge = meetMember(db, { name: "Alexander", kind: "human" });
    updateBond(db, keep.id, { status: "lost" });

    assert.throws(() => previewMergeMember(db, keep.id, merge.id), /cannot merge into it/);
  });
});

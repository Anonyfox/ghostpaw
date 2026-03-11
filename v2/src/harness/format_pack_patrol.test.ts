import assert from "node:assert/strict";
import { beforeEach, describe, it } from "node:test";
import { meetMember, noteInteraction, updateBond } from "../core/pack/api/write/index.ts";
import { initPackTables } from "../core/pack/runtime/index.ts";
import { type DatabaseHandle, openTestDatabase } from "../lib/index.ts";
import { formatPackPatrol } from "./format_pack_patrol.ts";

const DAY = 86_400_000;

let db: DatabaseHandle;

beforeEach(async () => {
  db = await openTestDatabase();
  initPackTables(db);
});

describe("formatPackPatrol", () => {
  it("returns empty text when there is no patrol work", () => {
    assert.strictEqual(formatPackPatrol(db, Date.now()), "");
  });

  it("formats the strongest patrol items compactly", () => {
    const now = new Date(2026, 2, 10).getTime();
    meetMember(db, { name: "Alice", kind: "human" });
    updateBond(db, 1, { trust: 0.9 });
    noteInteraction(db, {
      memberId: 1,
      kind: "conflict",
      summary: "rough patch",
      occurredAt: now - 2 * DAY,
    });

    const text = formatPackPatrol(db, now);
    assert.match(text, /Current pack patrol items/);
    assert.match(text, /Alice/);
    assert.match(text, /Conflict 2d ago/);
  });
});

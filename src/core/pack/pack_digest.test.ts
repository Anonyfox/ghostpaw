import assert from "node:assert";
import { beforeEach, describe, it } from "node:test";
import { type DatabaseHandle, openTestDatabase } from "../../lib/index.ts";
import { meetMember } from "./meet_member.ts";
import { noteInteraction } from "./note_interaction.ts";
import { packDigest } from "./pack_digest.ts";
import { initPackTables } from "./runtime/schema.ts";
import { updateBond } from "./update_bond.ts";

const DAY = 86_400_000;

let db: DatabaseHandle;

beforeEach(async () => {
  db = await openTestDatabase();
  initPackTables(db);
});

describe("packDigest", () => {
  it("returns empty digest for empty pack", () => {
    const d = packDigest(db);
    assert.deepStrictEqual(d.drift, []);
    assert.deepStrictEqual(d.landmarks, []);
    assert.deepStrictEqual(d.patrol, []);
    assert.strictEqual(d.stats.activeMembers, 0);
    assert.strictEqual(d.stats.recentInteractions, 0);
  });

  it("combines drift and landmarks", () => {
    const now = new Date(2026, 2, 10).getTime();

    meetMember(db, { name: "Drifter", kind: "human" });
    updateBond(db, 1, { trust: 0.85 });
    db.prepare("UPDATE pack_members SET last_contact = ? WHERE id = 1").run(now - 20 * DAY);

    meetMember(db, { name: "Birthday", kind: "human", birthday: "1992-03-15" });
    updateBond(db, 2, { trust: 0.75 });
    db.prepare("UPDATE pack_members SET last_contact = ? WHERE id = 2").run(now - 20 * DAY);

    const d = packDigest(db, 14, now);
    assert.strictEqual(d.drift.length, 1);
    assert.strictEqual(d.drift[0].name, "Drifter");
    assert.strictEqual(d.landmarks.length, 1);
    assert.strictEqual(d.landmarks[0].name, "Birthday");
    assert.strictEqual(d.patrol.length, 2);
    assert.strictEqual(d.stats.activeMembers, 2);
  });

  it("computes recent interaction count", () => {
    const now = Date.now();
    meetMember(db, { name: "Active", kind: "human" });
    noteInteraction(db, { memberId: 1, kind: "conversation", summary: "Chat 1" });
    noteInteraction(db, { memberId: 1, kind: "conversation", summary: "Chat 2" });

    const d = packDigest(db, 14, now + 1000);
    assert.strictEqual(d.stats.recentInteractions, 2);
  });

  it("computes average trust for active members only", () => {
    meetMember(db, { name: "A", kind: "human" });
    updateBond(db, 1, { trust: 0.8 });
    meetMember(db, { name: "B", kind: "human" });
    updateBond(db, 2, { trust: 0.6 });
    meetMember(db, { name: "Dormant", kind: "human" });
    updateBond(db, 3, { trust: 0.2, status: "dormant" });

    const d = packDigest(db);
    assert.strictEqual(d.stats.averageTrust, 0.7);
    assert.strictEqual(d.stats.activeMembers, 2);
    assert.strictEqual(d.stats.dormantMembers, 1);
  });

  it("includes compact patrol maintenance items", () => {
    const now = new Date(2026, 2, 10).getTime();
    meetMember(db, { name: "Repair", kind: "human" });
    updateBond(db, 1, { trust: 0.9 });
    db.prepare(
      `INSERT INTO pack_interactions (member_id, kind, summary, significance, session_id, occurred_at, created_at)
       VALUES (?, 'conflict', 'rough patch', 0.5, NULL, ?, ?)`,
    ).run(1, now - 2 * DAY, now - 2 * DAY);
    db.prepare("UPDATE pack_members SET last_contact = ? WHERE id = 1").run(now - 2 * DAY);

    meetMember(db, { name: "Birthday", kind: "human", birthday: "1992-03-12" });
    updateBond(db, 2, { trust: 0.75 });
    db.prepare("UPDATE pack_members SET last_contact = ? WHERE id = 2").run(now - 15 * DAY);

    const digest = packDigest(db, 14, now);
    assert.strictEqual(digest.patrol.length, 2);
    assert.strictEqual(digest.patrol[0].kind, "repair");
    assert.strictEqual(digest.patrol[1].kind, "landmark");
  });
});

import assert from "node:assert";
import { beforeEach, describe, it } from "node:test";
import { type DatabaseHandle, openTestDatabase } from "../../lib/index.ts";
import { detectDrift } from "./detect_drift.ts";
import { meetMember } from "./meet_member.ts";
import { initPackTables } from "./schema.ts";
import { updateBond } from "./update_bond.ts";

const DAY = 86_400_000;

let db: DatabaseHandle;

beforeEach(async () => {
  db = await openTestDatabase();
  initPackTables(db);
});

function seedInteractionHistory(memberId: number, timestamps: number[]): void {
  for (const timestamp of timestamps) {
    db.prepare(
      `INSERT INTO pack_interactions (member_id, kind, summary, significance, session_id, occurred_at, created_at)
       VALUES (?, 'conversation', ?, 0.5, NULL, ?, ?)`,
    ).run(memberId, `touch-${timestamp}`, timestamp, timestamp);
  }
  const lastTimestamp = timestamps[timestamps.length - 1];
  db.prepare("UPDATE pack_members SET last_contact = ?, updated_at = ? WHERE id = ?").run(
    lastTimestamp,
    lastTimestamp,
    memberId,
  );
}

describe("detectDrift", () => {
  it("returns nothing for an empty pack", () => {
    const alerts = detectDrift(db);
    assert.deepStrictEqual(alerts, []);
  });

  it("detects deep bond drifting after 14 days", () => {
    const now = Date.now();
    meetMember(db, { name: "Alice", kind: "human" });
    updateBond(db, 1, { trust: 0.85 });
    db.prepare("UPDATE pack_members SET last_contact = ? WHERE id = 1").run(now - 15 * DAY);

    const alerts = detectDrift(db, now);
    assert.strictEqual(alerts.length, 1);
    assert.strictEqual(alerts[0].tier, "deep");
    assert.strictEqual(alerts[0].daysSilent, 15);
    assert.strictEqual(alerts[0].source, "fallback");
    assert.strictEqual(alerts[0].thresholdDays, 14);
  });

  it("does not alert for deep bond within 14 days", () => {
    const now = Date.now();
    meetMember(db, { name: "Alice", kind: "human" });
    updateBond(db, 1, { trust: 0.85 });
    db.prepare("UPDATE pack_members SET last_contact = ? WHERE id = 1").run(now - 10 * DAY);

    const alerts = detectDrift(db, now);
    assert.strictEqual(alerts.length, 0);
  });

  it("detects solid bond drifting after 30 days", () => {
    const now = Date.now();
    meetMember(db, { name: "Bob", kind: "human" });
    updateBond(db, 1, { trust: 0.65 });
    db.prepare("UPDATE pack_members SET last_contact = ? WHERE id = 1").run(now - 35 * DAY);

    const alerts = detectDrift(db, now);
    assert.strictEqual(alerts.length, 1);
    assert.strictEqual(alerts[0].tier, "solid");
  });

  it("detects growing bond drifting after 60 days", () => {
    const now = Date.now();
    meetMember(db, { name: "Carol", kind: "human" });
    updateBond(db, 1, { trust: 0.4 });
    db.prepare("UPDATE pack_members SET last_contact = ? WHERE id = 1").run(now - 65 * DAY);

    const alerts = detectDrift(db, now);
    assert.strictEqual(alerts.length, 1);
    assert.strictEqual(alerts[0].tier, "growing");
  });

  it("uses cadence-aware thresholds when interaction rhythm is established", () => {
    const now = 100 * DAY;
    meetMember(db, { name: "Rhythmic", kind: "human" });
    updateBond(db, 1, { trust: 0.4 });
    seedInteractionHistory(1, [now - 41 * DAY, now - 34 * DAY, now - 27 * DAY, now - 20 * DAY]);

    const alerts = detectDrift(db, now);
    assert.strictEqual(alerts.length, 1);
    assert.strictEqual(alerts[0].source, "cadence");
    assert.strictEqual(alerts[0].baselineDays, 7);
    assert.strictEqual(alerts[0].thresholdDays, 18);
  });

  it("falls back to trust thresholds when interaction history is sparse", () => {
    const now = 100 * DAY;
    meetMember(db, { name: "Sparse", kind: "human" });
    updateBond(db, 1, { trust: 0.4 });
    seedInteractionHistory(1, [now - 100 * DAY, now - 50 * DAY]);

    const alerts = detectDrift(db, now);
    assert.strictEqual(alerts.length, 0);

    db.prepare("UPDATE pack_members SET last_contact = ? WHERE id = 1").run(now - 65 * DAY);
    const fallbackAlerts = detectDrift(db, now);
    assert.strictEqual(fallbackAlerts.length, 1);
    assert.strictEqual(fallbackAlerts[0].source, "fallback");
    assert.strictEqual(fallbackAlerts[0].thresholdDays, 60);
  });

  it("relaxes cadence thresholds for bursty relationships", () => {
    const now = 100 * DAY;
    meetMember(db, { name: "Bursty", kind: "human" });
    updateBond(db, 1, { trust: 0.65 });
    seedInteractionHistory(1, [now - 61 * DAY, now - 49 * DAY, now - 47 * DAY, now - 35 * DAY]);

    const alerts = detectDrift(db, now);
    assert.strictEqual(alerts.length, 0);
  });

  it("ignores shallow bonds", () => {
    const now = Date.now();
    meetMember(db, { name: "Dan", kind: "human" });
    updateBond(db, 1, { trust: 0.2 });
    db.prepare("UPDATE pack_members SET last_contact = ? WHERE id = 1").run(now - 120 * DAY);

    const alerts = detectDrift(db, now);
    assert.strictEqual(alerts.length, 0);
  });

  it("ignores dormant members", () => {
    const now = Date.now();
    meetMember(db, { name: "Eve", kind: "human" });
    updateBond(db, 1, { trust: 0.9, status: "dormant" });
    db.prepare("UPDATE pack_members SET last_contact = ? WHERE id = 1").run(now - 30 * DAY);

    const alerts = detectDrift(db, now);
    assert.strictEqual(alerts.length, 0);
  });

  it("orders by trust DESC then silence ASC", () => {
    const now = Date.now();
    meetMember(db, { name: "Low", kind: "human" });
    updateBond(db, 1, { trust: 0.4 });
    db.prepare("UPDATE pack_members SET last_contact = ? WHERE id = 1").run(now - 70 * DAY);

    meetMember(db, { name: "High", kind: "human" });
    updateBond(db, 2, { trust: 0.9 });
    db.prepare("UPDATE pack_members SET last_contact = ? WHERE id = 2").run(now - 20 * DAY);

    const alerts = detectDrift(db, now);
    assert.strictEqual(alerts.length, 2);
    assert.strictEqual(alerts[0].name, "High");
    assert.strictEqual(alerts[1].name, "Low");
  });
});

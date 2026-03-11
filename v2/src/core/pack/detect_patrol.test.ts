import assert from "node:assert/strict";
import { beforeEach, describe, it } from "node:test";
import { type DatabaseHandle, openTestDatabase } from "../../lib/index.ts";
import { detectPatrol } from "./detect_patrol.ts";
import { initPackTables } from "./schema.ts";
import type { DriftAlert, Landmark } from "./types.ts";
import { meetMember } from "./meet_member.ts";
import { updateBond } from "./update_bond.ts";

const DAY = 86_400_000;

let db: DatabaseHandle;

beforeEach(async () => {
  db = await openTestDatabase();
  initPackTables(db);
});

function seedInteraction(memberId: number, kind: string, timestamp: number): void {
  db.prepare(
    `INSERT INTO pack_interactions (member_id, kind, summary, significance, session_id, occurred_at, created_at)
     VALUES (?, ?, ?, 0.5, NULL, ?, ?)`,
  ).run(memberId, kind, `${kind}-${timestamp}`, timestamp, timestamp);
  db.prepare("UPDATE pack_members SET last_contact = ?, updated_at = ? WHERE id = ?").run(
    timestamp,
    timestamp,
    memberId,
  );
}

describe("detectPatrol", () => {
  it("surfaces recent high-trust conflict without follow-up", () => {
    const now = 100 * DAY;
    meetMember(db, { name: "Alice", kind: "human" });
    updateBond(db, 1, { trust: 0.85 });
    seedInteraction(1, "conflict", now - 3 * DAY);

    const items = detectPatrol(db, [], [], now);
    assert.strictEqual(items.length, 1);
    assert.strictEqual(items[0].kind, "repair");
    assert.match(items[0].summary, /3d ago/);
  });

  it("ranks and bounds patrol items", () => {
    const now = 100 * DAY;
    const drift: DriftAlert[] = [];
    const landmarks: Landmark[] = [];

    for (const [index, name] of ["One", "Two", "Three", "Four"].entries()) {
      meetMember(db, { name, kind: "human" });
      updateBond(db, index + 1, { trust: 0.85 });
      seedInteraction(index + 1, "conflict", now - (index + 1) * DAY);
    }

    drift.push({
      memberId: 1,
      name: "One",
      trust: 0.85,
      tier: "deep",
      daysSilent: 20,
      thresholdDays: 14,
      source: "fallback",
    });
    landmarks.push({
      memberId: 2,
      name: "Two",
      type: "birthday",
      date: "1990-03-12",
      daysAway: 1,
    });

    const items = detectPatrol(db, drift, landmarks, now);
    assert.strictEqual(items.length, 3);
    assert.strictEqual(items[0].memberId, 1);
  });
});

import assert from "node:assert";
import { beforeEach, describe, it } from "node:test";
import { type DatabaseHandle, openTestDatabase } from "../../lib/index.ts";
import { meetMember } from "./meet_member.ts";
import { noteInteraction } from "./note_interaction.ts";
import { initPackTables } from "./schema.ts";
import { upcomingLandmarks } from "./upcoming_landmarks.ts";

let db: DatabaseHandle;

beforeEach(async () => {
  db = await openTestDatabase();
  initPackTables(db);
});

describe("upcomingLandmarks", () => {
  it("returns nothing for an empty pack", () => {
    assert.deepStrictEqual(upcomingLandmarks(db), []);
  });

  it("finds upcoming birthdays", () => {
    const mar15 = new Date(2026, 2, 15).getTime();
    meetMember(db, { name: "Alice", kind: "human", birthday: "1992-03-18" });

    const results = upcomingLandmarks(db, 14, mar15);
    assert.strictEqual(results.length, 1);
    assert.strictEqual(results[0].type, "birthday");
    assert.strictEqual(results[0].name, "Alice");
    assert.strictEqual(results[0].daysAway, 3);
    assert.strictEqual(results[0].date, "2026-03-18");
  });

  it("skips birthdays outside the window", () => {
    const jan1 = new Date(2026, 0, 1).getTime();
    meetMember(db, { name: "Bob", kind: "human", birthday: "1990-06-15" });

    const results = upcomingLandmarks(db, 14, jan1);
    assert.strictEqual(results.length, 0);
  });

  it("finds milestone anniversaries", () => {
    meetMember(db, { name: "Acme Corp", kind: "group" });
    const mar15_2024 = new Date(2024, 2, 15).getTime();
    noteInteraction(db, {
      memberId: 1,
      kind: "milestone",
      summary: "Contract signed",
      occurredAt: mar15_2024,
    });

    const now = new Date(2026, 2, 10).getTime();
    const results = upcomingLandmarks(db, 14, now);
    assert.strictEqual(results.length, 1);
    assert.strictEqual(results[0].type, "anniversary");
    assert.strictEqual(results[0].yearsAgo, 2);
    assert.strictEqual(results[0].summary, "Contract signed");
  });

  it("skips first-year milestones (not yet an anniversary)", () => {
    meetMember(db, { name: "NewCo", kind: "group" });
    const mar15_2026 = new Date(2026, 2, 15).getTime();
    noteInteraction(db, {
      memberId: 1,
      kind: "milestone",
      summary: "Just met",
      occurredAt: mar15_2026,
    });

    const now = new Date(2026, 2, 10).getTime();
    const results = upcomingLandmarks(db, 14, now);
    assert.strictEqual(results.length, 0);
  });

  it("ignores lost members", () => {
    meetMember(db, { name: "Gone", kind: "human", birthday: "1990-03-12" });
    db.prepare("UPDATE pack_members SET status = 'lost' WHERE id = 1").run();

    const now = new Date(2026, 2, 10).getTime();
    const results = upcomingLandmarks(db, 14, now);
    assert.strictEqual(results.length, 0);
  });

  it("sorts by daysAway ascending", () => {
    const now = new Date(2026, 2, 10).getTime();
    meetMember(db, { name: "Later", kind: "human", birthday: "1990-03-20" });
    meetMember(db, { name: "Sooner", kind: "human", birthday: "1995-03-12" });

    const results = upcomingLandmarks(db, 14, now);
    assert.strictEqual(results.length, 2);
    assert.strictEqual(results[0].name, "Sooner");
    assert.strictEqual(results[1].name, "Later");
  });

  it("handles year wrap (Dec looking into Jan)", () => {
    const dec28 = new Date(2025, 11, 28).getTime();
    meetMember(db, { name: "Jan", kind: "human", birthday: "1988-01-05" });

    const results = upcomingLandmarks(db, 14, dec28);
    assert.strictEqual(results.length, 1);
    assert.strictEqual(results[0].date, "2026-01-05");
  });
});

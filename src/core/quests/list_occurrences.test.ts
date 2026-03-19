import { strictEqual } from "node:assert";
import { beforeEach, describe, it } from "node:test";
import type { DatabaseHandle } from "../../lib/index.ts";
import { openTestDatabase } from "../../lib/index.ts";
import { completeQuest } from "./complete_quest.ts";
import { createQuest } from "./create_quest.ts";
import { listOccurrences } from "./list_occurrences.ts";
import { initQuestTables } from "./schema.ts";

let db: DatabaseHandle;

beforeEach(async () => {
  db = await openTestDatabase();
  initQuestTables(db);
});

describe("listOccurrences", () => {
  it("returns empty for quest with no occurrences", () => {
    const q = createQuest(db, { title: "Daily", rrule: "FREQ=DAILY" });
    strictEqual(listOccurrences(db, q.id).length, 0);
  });

  it("lists occurrences in reverse chronological order", () => {
    const q = createQuest(db, { title: "Daily", rrule: "FREQ=DAILY" });
    const t1 = Date.now();
    const t2 = t1 + 86400000;
    const t3 = t2 + 86400000;
    completeQuest(db, q.id, t1);
    completeQuest(db, q.id, t2);
    completeQuest(db, q.id, t3);
    const occs = listOccurrences(db, q.id);
    strictEqual(occs.length, 3);
    strictEqual(occs[0].occurrenceAt, t3);
    strictEqual(occs[2].occurrenceAt, t1);
  });

  it("filters by since/until", () => {
    const q = createQuest(db, { title: "Daily", rrule: "FREQ=DAILY" });
    const t1 = 1000000;
    const t2 = 2000000;
    const t3 = 3000000;
    completeQuest(db, q.id, t1);
    completeQuest(db, q.id, t2);
    completeQuest(db, q.id, t3);
    const middle = listOccurrences(db, q.id, { since: 1500000, until: 2500000 });
    strictEqual(middle.length, 1);
    strictEqual(middle[0].occurrenceAt, t2);
  });

  it("respects limit", () => {
    const q = createQuest(db, { title: "Daily", rrule: "FREQ=DAILY" });
    for (let i = 0; i < 5; i++) {
      completeQuest(db, q.id, Date.now() + i * 86400000);
    }
    strictEqual(listOccurrences(db, q.id, { limit: 2 }).length, 2);
  });
});

import { ok, strictEqual, throws } from "node:assert";
import { beforeEach, describe, it } from "node:test";
import type { DatabaseHandle } from "../../lib/index.ts";
import { openTestDatabase } from "../../lib/index.ts";
import { createQuest } from "./create_quest.ts";
import { initQuestTables } from "./schema.ts";
import { skipOccurrence } from "./skip_occurrence.ts";

let db: DatabaseHandle;

beforeEach(async () => {
  db = await openTestDatabase();
  initQuestTables(db);
});

describe("skipOccurrence", () => {
  it("records a skipped occurrence", () => {
    const q = createQuest(db, { title: "Daily", rrule: "FREQ=DAILY" });
    const now = Date.now();
    const occ = skipOccurrence(db, q.id, now);
    strictEqual(occ.status, "skipped");
    strictEqual(occ.occurrenceAt, now);
    ok(occ.completedAt > 0);
  });

  it("throws for non-recurring quest", () => {
    const q = createQuest(db, { title: "One-off" });
    throws(() => skipOccurrence(db, q.id, Date.now()), /not recurring/);
  });

  it("throws for nonexistent quest", () => {
    throws(() => skipOccurrence(db, 999, Date.now()), /not found/);
  });
});

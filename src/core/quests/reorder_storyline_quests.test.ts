import { strictEqual, throws } from "node:assert";
import { beforeEach, describe, it } from "node:test";
import type { DatabaseHandle } from "../../lib/index.ts";
import { openTestDatabase } from "../../lib/index.ts";
import { createQuest } from "./create_quest.ts";
import { createStoryline } from "./create_storyline.ts";
import { getQuest } from "./get_quest.ts";
import { reorderStorylineQuests } from "./reorder_storyline_quests.ts";
import { initQuestTables } from "./schema.ts";

let db: DatabaseHandle;

beforeEach(async () => {
  db = await openTestDatabase();
  initQuestTables(db);
});

describe("reorderStorylineQuests", () => {
  it("assigns positions as 1000, 2000, 3000", () => {
    const s = createStoryline(db, { title: "Story" });
    const q1 = createQuest(db, { title: "First", storylineId: s.id });
    const q2 = createQuest(db, { title: "Second", storylineId: s.id });
    const q3 = createQuest(db, { title: "Third", storylineId: s.id });

    reorderStorylineQuests(db, s.id, [q3.id, q1.id, q2.id]);

    strictEqual(getQuest(db, q3.id)!.position, 1000);
    strictEqual(getQuest(db, q1.id)!.position, 2000);
    strictEqual(getQuest(db, q2.id)!.position, 3000);
  });

  it("throws when quest does not belong to storyline", () => {
    const s = createStoryline(db, { title: "Story" });
    const q = createQuest(db, { title: "Orphan" });
    throws(() => reorderStorylineQuests(db, s.id, [q.id]), /does not belong/);
  });

  it("handles empty ordered list", () => {
    const s = createStoryline(db, { title: "Empty" });
    reorderStorylineQuests(db, s.id, []);
  });

  it("handles partial reorder", () => {
    const s = createStoryline(db, { title: "Story" });
    const q1 = createQuest(db, { title: "A", storylineId: s.id });
    const q2 = createQuest(db, { title: "B", storylineId: s.id });

    reorderStorylineQuests(db, s.id, [q2.id]);

    strictEqual(getQuest(db, q2.id)!.position, 1000);
    strictEqual(getQuest(db, q1.id)!.position, q1.position);
  });
});

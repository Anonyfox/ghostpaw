import { strictEqual } from "node:assert";
import { beforeEach, describe, it } from "node:test";
import type { DatabaseHandle } from "../../lib/index.ts";
import { openTestDatabase } from "../../lib/index.ts";
import { createStoryline } from "./create_storyline.ts";
import { listStorylines } from "./list_storylines.ts";
import { initQuestTables } from "./schema.ts";
import { updateStoryline } from "./update_storyline.ts";

let db: DatabaseHandle;

beforeEach(async () => {
  db = await openTestDatabase();
  initQuestTables(db);
});

describe("listStorylines", () => {
  it("returns all storylines ordered by updated_at desc", () => {
    createStoryline(db, { title: "A" });
    createStoryline(db, { title: "B" });
    createStoryline(db, { title: "C" });
    const logs = listStorylines(db);
    strictEqual(logs.length, 3);
    strictEqual(logs[0].title, "C");
  });

  it("filters by status", () => {
    const a = createStoryline(db, { title: "A" });
    createStoryline(db, { title: "B" });
    updateStoryline(db, a.id, { status: "archived" });
    const archived = listStorylines(db, { status: "archived" });
    strictEqual(archived.length, 1);
    strictEqual(archived[0].title, "A");
  });

  it("respects limit and offset", () => {
    for (let i = 0; i < 5; i++) {
      createStoryline(db, { title: `Log ${i}` });
    }
    const page = listStorylines(db, { limit: 2, offset: 2 });
    strictEqual(page.length, 2);
  });
});

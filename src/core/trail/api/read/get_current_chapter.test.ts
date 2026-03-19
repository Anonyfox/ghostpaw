import { strictEqual } from "node:assert";
import { beforeEach, describe, it } from "node:test";
import { type DatabaseHandle, openTestDatabase } from "../../../../lib/index.ts";
import { initTrailTables } from "../../schema.ts";
import { updateTrailState } from "../write/update_trail_state.ts";
import { getCurrentChapter } from "./get_current_chapter.ts";

let db: DatabaseHandle;

beforeEach(async () => {
  db = await openTestDatabase();
  initTrailTables(db);
});

describe("getCurrentChapter", () => {
  it("returns null when no chapters exist", () => {
    strictEqual(getCurrentChapter(db), null);
  });

  it("returns the open chapter", () => {
    updateTrailState(db, { createChapter: { label: "Active" } });
    const ch = getCurrentChapter(db);
    strictEqual(ch?.label, "Active");
    strictEqual(ch?.endedAt, null);
  });

  it("returns null when all chapters are ended", () => {
    const { chapter } = updateTrailState(db, { createChapter: { label: "Done" } });
    updateTrailState(db, { updateChapter: { id: chapter!.id, endedAt: Date.now() } });
    strictEqual(getCurrentChapter(db), null);
  });
});

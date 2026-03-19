import { ok, strictEqual } from "node:assert";
import { beforeEach, describe, it } from "node:test";
import { type DatabaseHandle, openTestDatabase } from "../../../../lib/index.ts";
import { initTrailTables } from "../../schema.ts";
import { updateTrailState } from "./update_trail_state.ts";

let db: DatabaseHandle;

beforeEach(async () => {
  db = await openTestDatabase();
  initTrailTables(db);
});

describe("updateTrailState", () => {
  it("creates a new chapter", () => {
    const result = updateTrailState(db, {
      createChapter: { label: "Chapter 1", momentum: "rising", confidence: 0.7 },
    });
    ok(result.chapter);
    strictEqual(result.chapter.label, "Chapter 1");
    strictEqual(result.chapter.momentum, "rising");
    strictEqual(result.chapter.endedAt, null);
  });

  it("creates trailmarks", () => {
    const result = updateTrailState(db, {
      trailmarks: [
        { kind: "milestone", description: "First login" },
        { kind: "first", description: "First question", significance: 0.8 },
      ],
    });
    strictEqual(result.trailmarks.length, 2);
    strictEqual(result.trailmarks[0].kind, "milestone");
    strictEqual(result.trailmarks[1].significance, 0.8);
  });

  it("updates an existing chapter", () => {
    const { chapter } = updateTrailState(db, {
      createChapter: { label: "Ch 1" },
    });
    ok(chapter);

    const endTime = Date.now();
    const updated = updateTrailState(db, {
      updateChapter: { id: chapter.id, momentum: "declining", endedAt: endTime },
    });
    ok(updated.chapter);
    strictEqual(updated.chapter.momentum, "declining");
    strictEqual(updated.chapter.endedAt, endTime);
  });

  it("rolls back on error in trailmarks", () => {
    let threw = false;
    try {
      updateTrailState(db, {
        createChapter: { label: "Will rollback" },
        // biome-ignore lint/suspicious/noExplicitAny: intentionally invalid for constraint test
        trailmarks: [{ kind: "invalid_kind" as any, description: "bad" }],
      });
    } catch {
      threw = true;
    }
    ok(threw);
    const row = db.prepare("SELECT COUNT(*) AS c FROM trail_chapters").get() as { c: number };
    strictEqual(row.c, 0, "chapter should be rolled back");
  });
});

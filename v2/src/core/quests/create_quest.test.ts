import { ok, strictEqual, throws } from "node:assert";
import { beforeEach, describe, it } from "node:test";
import type { DatabaseHandle } from "../../lib/index.ts";
import { openTestDatabase } from "../../lib/index.ts";
import { createQuest } from "./create_quest.ts";
import { initQuestTables } from "./schema.ts";

let db: DatabaseHandle;

beforeEach(async () => {
  db = await openTestDatabase();
  initQuestTables(db);
});

describe("createQuest", () => {
  it("creates a quest with only a title", () => {
    const q = createQuest(db, { title: "Deploy v3" });
    ok(q.id > 0);
    strictEqual(q.title, "Deploy v3");
    strictEqual(q.status, "accepted");
    strictEqual(q.priority, "normal");
    strictEqual(q.createdBy, "human");
    strictEqual(q.storylineId, null);
    strictEqual(q.description, null);
    ok(q.createdAt > 0);
    strictEqual(q.createdAt, q.updatedAt);
  });

  it("creates a quest with all optional fields", () => {
    const now = Date.now();
    const log = db
      .prepare(
        "INSERT INTO storylines (title, created_at, created_by, updated_at) VALUES (?, ?, ?, ?)",
      )
      .run("Project X", now, "human", now);

    const q = createQuest(db, {
      title: "Write tests",
      description: "Cover edge cases",
      storylineId: Number(log.lastInsertRowid),
      priority: "high",
      tags: "code,testing",
      createdBy: "ghostpaw",
      startsAt: now,
      endsAt: now + 3600000,
      dueAt: now + 86400000,
      remindAt: now + 43200000,
      rrule: "FREQ=WEEKLY;BYDAY=MO",
    });

    strictEqual(q.description, "Cover edge cases");
    strictEqual(q.priority, "high");
    strictEqual(q.tags, "code,testing");
    strictEqual(q.createdBy, "ghostpaw");
    strictEqual(q.startsAt, now);
    strictEqual(q.rrule, "FREQ=WEEKLY;BYDAY=MO");
    ok(q.storylineId! > 0);
  });

  it("rejects empty title", () => {
    throws(() => createQuest(db, { title: "" }), /title is required/);
  });

  it("rejects whitespace-only title", () => {
    throws(() => createQuest(db, { title: "   " }), /title is required/);
  });

  it("rejects invalid priority", () => {
    throws(
      () => createQuest(db, { title: "test", priority: "critical" as never }),
      /Invalid priority/,
    );
  });

  it("rejects nonexistent storyline_id", () => {
    throws(() => createQuest(db, { title: "test", storylineId: 999 }), /does not exist/);
  });

  it("trims title and description", () => {
    const q = createQuest(db, {
      title: "  padded  ",
      description: "  spaced  ",
    });
    strictEqual(q.title, "padded");
    strictEqual(q.description, "spaced");
  });
});

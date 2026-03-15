import { strictEqual } from "node:assert";
import { beforeEach, describe, it } from "node:test";
import { type DatabaseHandle, openTestDatabase } from "../../../lib/index.ts";
import { initTrailTables } from "../schema.ts";
import { seedStarterQuestions } from "./seed_starter_questions.ts";

let db: DatabaseHandle;

beforeEach(async () => {
  db = await openTestDatabase();
  initTrailTables(db);
});

describe("seedStarterQuestions", () => {
  it("seeds starter questions and curiosity loops on first call", () => {
    seedStarterQuestions(db);
    const questions = db.prepare("SELECT * FROM trail_starter_questions").all() as Record<
      string,
      unknown
    >[];
    strictEqual(questions.length, 6);
    const loops = db
      .prepare("SELECT * FROM trail_open_loops WHERE category = 'curiosity'")
      .all() as Record<string, unknown>[];
    strictEqual(loops.length, 6);
  });

  it("is idempotent — second call does nothing", () => {
    seedStarterQuestions(db);
    seedStarterQuestions(db);
    const questions = db.prepare("SELECT * FROM trail_starter_questions").all() as Record<
      string,
      unknown
    >[];
    strictEqual(questions.length, 6);
  });

  it("links each question to its open loop", () => {
    seedStarterQuestions(db);
    const unlinked = db
      .prepare("SELECT * FROM trail_starter_questions WHERE loop_id IS NULL")
      .all() as Record<string, unknown>[];
    strictEqual(unlinked.length, 0);
  });

  it("creates loops with ask action and curiosity category", () => {
    seedStarterQuestions(db);
    const loops = db
      .prepare(
        "SELECT * FROM trail_open_loops WHERE category = 'curiosity' AND recommended_action = 'ask'",
      )
      .all() as Record<string, unknown>[];
    strictEqual(loops.length, 6);
  });
});

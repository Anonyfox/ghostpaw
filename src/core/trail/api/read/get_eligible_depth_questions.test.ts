import { strictEqual } from "node:assert";
import { beforeEach, describe, it } from "node:test";
import { type DatabaseHandle, openTestDatabase } from "../../../../lib/index.ts";
import { initPackTables } from "../../../pack/runtime/schema.ts";
import { initTrailTables } from "../../schema.ts";
import { getEligibleDepthQuestions } from "./get_eligible_depth_questions.ts";

let db: DatabaseHandle;

function seedUser(trust: number): void {
  const now = Date.now();
  db.prepare(
    `INSERT INTO pack_members
     (name, kind, bond, trust, status, is_user, first_contact, last_contact, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
  ).run("User", "human", "owner", trust, "active", 1, now, now, now, now);
}

function seedCuriosityLoop(description: string, tier: string, significance: number): void {
  const now = Date.now();
  const { lastInsertRowid } = db
    .prepare(
      `INSERT INTO trail_open_loops
       (description, category, significance, status, recommended_action, created_at, updated_at)
       VALUES (?, 'curiosity', ?, 'alive', 'ask', ?, ?)`,
    )
    .run(description, significance, now, now);
  db.prepare(
    `INSERT INTO trail_starter_questions (question, priority, tier, loop_id, seeded_at)
     VALUES (?, 1, ?, ?, ?)`,
  ).run(description, tier, Number(lastInsertRowid), now);
}

beforeEach(async () => {
  db = await openTestDatabase();
  initPackTables(db);
  initTrailTables(db);
});

describe("getEligibleDepthQuestions", () => {
  it("returns empty when no curiosity loops exist", () => {
    strictEqual(getEligibleDepthQuestions(db).length, 0);
  });

  it("returns starter-tier questions regardless of trust", () => {
    seedUser(0.1);
    seedCuriosityLoop("What should I call you?", "starter", 0.9);
    strictEqual(getEligibleDepthQuestions(db).length, 1);
  });

  it("excludes depth-tier questions when trust is below threshold", () => {
    seedUser(0.3);
    seedCuriosityLoop("What are you most proud of building?", "depth", 0.8);
    strictEqual(getEligibleDepthQuestions(db).length, 0);
  });

  it("includes depth-tier questions when trust is at or above threshold", () => {
    seedUser(0.7);
    seedCuriosityLoop("What are you most proud of building?", "depth", 0.8);
    strictEqual(getEligibleDepthQuestions(db).length, 1);
  });

  it("returns mixed tiers correctly", () => {
    seedUser(0.5);
    seedCuriosityLoop("What should I call you?", "starter", 0.9);
    seedCuriosityLoop("What are you most proud of?", "depth", 0.8);
    const results = getEligibleDepthQuestions(db);
    strictEqual(results.length, 1);
    strictEqual(results[0].tier, "starter");
  });
});

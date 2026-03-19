import { strictEqual } from "node:assert";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, it } from "node:test";
import {
  pendingFragmentCount,
  readSkillHealth,
  type SkillHealthData,
} from "../core/skills/api/read/index.ts";
import { dropSkillFragment, writeSkillHealth } from "../core/skills/api/write/index.ts";
import {
  initSkillEventsTables,
  initSkillFragmentsTables,
  initSkillHealthTables,
  resetGitAvailableCache,
} from "../core/skills/runtime/index.ts";
import type { DatabaseHandle } from "../lib/index.ts";
import { openTestDatabase } from "../lib/open_test_database.ts";
import { stokePhaseOne, stokePhaseTwoNeeded } from "./stoke.ts";

let workspace: string;
let db: DatabaseHandle;

beforeEach(async () => {
  resetGitAvailableCache();
  workspace = mkdtempSync(join(tmpdir(), "ghostpaw-stoke-"));
  mkdirSync(join(workspace, "skills"), { recursive: true });
  db = await openTestDatabase();
  initSkillEventsTables(db);
  initSkillFragmentsTables(db);
  initSkillHealthTables(db);
});

afterEach(() => {
  db.close();
  rmSync(workspace, { recursive: true, force: true });
});

function makeSkill(name: string): void {
  const dir = join(workspace, "skills", name);
  mkdirSync(dir, { recursive: true });
  writeFileSync(
    join(dir, "SKILL.md"),
    `---\nname: ${name}\ndescription: A test skill.\n---\n\n# ${name}\n\nInstructions.`,
  );
}

describe("stokePhaseOne", () => {
  it("writes skill health to database", () => {
    makeSkill("deploy");
    const health = stokePhaseOne(workspace, db);
    strictEqual(health.totalSkills, 1);
    strictEqual(health.explored, false);

    const stored = readSkillHealth(db);
    strictEqual(stored?.totalSkills, 1);
  });

  it("enforces fragment cap", () => {
    for (let i = 0; i < 55; i++) {
      dropSkillFragment(db, "quest", null, `obs ${i}`);
    }
    stokePhaseOne(workspace, db);
    strictEqual(pendingFragmentCount(db) <= 50, true);
  });
});

describe("stokePhaseTwoNeeded", () => {
  it("returns false when no fragments exist", () => {
    strictEqual(stokePhaseTwoNeeded(db), false);
  });

  it("returns true when 5+ fragments and no prior Phase 2", () => {
    for (let i = 0; i < 5; i++) {
      dropSkillFragment(db, "quest", null, `obs ${i}`);
    }
    strictEqual(stokePhaseTwoNeeded(db), true);
  });

  it("returns false when 5+ fragments but no new evidence since last Phase 2", () => {
    for (let i = 0; i < 5; i++) {
      dropSkillFragment(db, "quest", null, `obs ${i}`);
    }
    const health: SkillHealthData = {
      computedAt: Math.floor(Date.now() / 1000),
      totalSkills: 0,
      rankDistribution: {},
      staleSkills: [],
      dormantSkills: [],
      oversizedSkills: [],
      pendingFragments: 5,
      expiredFragments: 0,
      repairsApplied: 0,
      proposalsQueued: 0,
      explored: true,
    };
    writeSkillHealth(db, health);
    strictEqual(stokePhaseTwoNeeded(db), false);
  });

  it("returns true when new fragments arrive after prior Phase 2", () => {
    for (let i = 0; i < 5; i++) {
      dropSkillFragment(db, "quest", null, `obs ${i}`);
    }
    const pastTs = Math.floor(Date.now() / 1000) - 10;
    db.prepare(
      `INSERT INTO skill_health (computed_at, total_skills, rank_distribution, stale_skills,
        dormant_skills, oversized_skills, pending_fragments, expired_fragments, repairs_applied,
        proposals_queued, explored) VALUES (?, 0, '{}', '[]', '[]', '[]', 2, 0, 0, 0, 1)`,
    ).run(pastTs);
    for (let i = 0; i < 3; i++) {
      dropSkillFragment(db, "session", null, `new obs ${i}`);
    }
    strictEqual(stokePhaseTwoNeeded(db), true);
  });
});

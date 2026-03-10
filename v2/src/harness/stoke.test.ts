import { strictEqual } from "node:assert";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, it } from "node:test";
import { resetGitAvailableCache } from "../core/skills/git.ts";
import {
  dropSkillFragment,
  initSkillEventsTables,
  initSkillFragmentsTables,
  initSkillHealthTables,
  pendingFragmentCount,
  readSkillHealth,
} from "../core/skills/index.ts";
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

  it("returns true when 5+ fragments exist", () => {
    for (let i = 0; i < 5; i++) {
      dropSkillFragment(db, "quest", null, `obs ${i}`);
    }
    strictEqual(stokePhaseTwoNeeded(db), true);
  });
});

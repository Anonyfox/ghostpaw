import { deepStrictEqual, strictEqual } from "node:assert";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, it } from "node:test";
import { allSkillRanks } from "./all_skill_ranks.ts";
import { checkpoint } from "./checkpoint.ts";
import { resetGitAvailableCache } from "./git.ts";

let workspace: string;

beforeEach(() => {
  resetGitAvailableCache();
  workspace = mkdtempSync(join(tmpdir(), "ghostpaw-allranks-"));
  mkdirSync(join(workspace, "skills"), { recursive: true });
});

afterEach(() => {
  rmSync(workspace, { recursive: true, force: true });
});

function makeSkill(name: string): void {
  const dir = join(workspace, "skills", name);
  mkdirSync(dir, { recursive: true });
  writeFileSync(join(dir, "SKILL.md"), `---\nname: ${name}\ndescription: test\n---\nBody.`);
}

describe("allSkillRanks", () => {
  it("returns empty when no history exists", () => {
    deepStrictEqual(allSkillRanks(workspace), {});
  });

  it("returns ranks for a single skill", () => {
    makeSkill("deploy");
    checkpoint(workspace, ["deploy"], "first");
    deepStrictEqual(allSkillRanks(workspace), { deploy: 1 });
  });

  it("returns correct ranks for multiple skills", () => {
    makeSkill("deploy");
    makeSkill("testing");
    checkpoint(workspace, ["deploy", "testing"], "first");

    writeFileSync(join(workspace, "skills", "deploy", "SKILL.md"), "updated");
    checkpoint(workspace, ["deploy"], "second");

    const ranks = allSkillRanks(workspace);
    strictEqual(ranks.deploy, 2);
    strictEqual(ranks.testing, 1);
  });

  it("deduplicates multiple files in same skill per commit", () => {
    makeSkill("deploy");
    mkdirSync(join(workspace, "skills", "deploy", "scripts"), { recursive: true });
    writeFileSync(join(workspace, "skills", "deploy", "scripts", "run.sh"), "#!/bin/bash");
    checkpoint(workspace, ["deploy"], "multi-file");

    const ranks = allSkillRanks(workspace);
    strictEqual(ranks.deploy, 1);
  });

  it("counts multi-skill commits correctly for each skill", () => {
    makeSkill("deploy");
    makeSkill("testing");
    checkpoint(workspace, ["deploy", "testing"], "both");

    const ranks = allSkillRanks(workspace);
    strictEqual(ranks.deploy, 1);
    strictEqual(ranks.testing, 1);
  });
});

import { describe, it, beforeEach, afterEach } from "node:test";
import { strictEqual } from "node:assert";
import { mkdtempSync, rmSync, mkdirSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { skillRank } from "./skill_rank.ts";
import { checkpoint } from "./checkpoint.ts";
import { resetGitAvailableCache } from "./git.ts";

let workspace: string;

beforeEach(() => {
  resetGitAvailableCache();
  workspace = mkdtempSync(join(tmpdir(), "ghostpaw-rank-"));
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

describe("skillRank", () => {
  it("returns 0 when no history exists", () => {
    strictEqual(skillRank(workspace, "deploy"), 0);
  });

  it("returns 1 after one checkpoint", () => {
    makeSkill("deploy");
    checkpoint(workspace, ["deploy"], "first");
    strictEqual(skillRank(workspace, "deploy"), 1);
  });

  it("returns correct count after multiple checkpoints", () => {
    makeSkill("deploy");
    checkpoint(workspace, ["deploy"], "first");

    writeFileSync(join(workspace, "skills", "deploy", "SKILL.md"), "updated once");
    checkpoint(workspace, ["deploy"], "second");

    writeFileSync(join(workspace, "skills", "deploy", "SKILL.md"), "updated twice");
    checkpoint(workspace, ["deploy"], "third");

    strictEqual(skillRank(workspace, "deploy"), 3);
  });

  it("counts a multi-file commit as 1 rank", () => {
    makeSkill("deploy");
    mkdirSync(join(workspace, "skills", "deploy", "scripts"), { recursive: true });
    writeFileSync(join(workspace, "skills", "deploy", "scripts", "run.sh"), "#!/bin/bash");
    checkpoint(workspace, ["deploy"], "multi-file");
    strictEqual(skillRank(workspace, "deploy"), 1);
  });

  it("counts 1 for each skill in a multi-skill commit", () => {
    makeSkill("deploy");
    makeSkill("testing");
    checkpoint(workspace, ["deploy", "testing"], "both");
    strictEqual(skillRank(workspace, "deploy"), 1);
    strictEqual(skillRank(workspace, "testing"), 1);
  });
});

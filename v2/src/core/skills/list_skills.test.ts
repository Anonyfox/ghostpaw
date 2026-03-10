import { strictEqual } from "node:assert";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, it } from "node:test";
import { checkpoint } from "./checkpoint.ts";
import { resetGitAvailableCache } from "./git.ts";
import { listSkills } from "./list_skills.ts";

let workspace: string;

beforeEach(() => {
  resetGitAvailableCache();
  workspace = mkdtempSync(join(tmpdir(), "ghostpaw-list-skills-"));
  mkdirSync(join(workspace, "skills"), { recursive: true });
});

afterEach(() => {
  rmSync(workspace, { recursive: true, force: true });
});

function makeSkill(name: string, desc?: string): void {
  const dir = join(workspace, "skills", name);
  mkdirSync(dir, { recursive: true });
  writeFileSync(
    join(dir, "SKILL.md"),
    `---\nname: ${name}\ndescription: ${desc ?? "A test skill."}\n---\n\n# ${name}\n\nInstructions.`,
  );
}

describe("listSkills", () => {
  it("returns empty list when no skills exist", () => {
    strictEqual(listSkills(workspace).length, 0);
  });

  it("lists multiple skills sorted by name", () => {
    makeSkill("testing", "Run tests.");
    makeSkill("deploy", "Deploy.");
    const list = listSkills(workspace);
    strictEqual(list.length, 2);
    strictEqual(list[0].name, "deploy");
    strictEqual(list[1].name, "testing");
  });

  it("shows rank 0 and Uncheckpointed tier for skills without git history", () => {
    makeSkill("deploy");
    const list = listSkills(workspace);
    strictEqual(list[0].rank, 0);
    strictEqual(list[0].tier, "Uncheckpointed");
    strictEqual(list[0].readiness, "grey");
  });

  it("shows correct rank after checkpoints", () => {
    makeSkill("deploy");
    checkpoint(workspace, ["deploy"], "first");
    writeFileSync(
      join(workspace, "skills", "deploy", "SKILL.md"),
      "---\nname: deploy\ndescription: updated\n---\nUpdated.",
    );
    checkpoint(workspace, ["deploy"], "second");

    const list = listSkills(workspace);
    strictEqual(list[0].rank, 2);
  });

  it("flags skills with pending changes", () => {
    makeSkill("deploy");
    checkpoint(workspace, ["deploy"], "init");
    writeFileSync(
      join(workspace, "skills", "deploy", "SKILL.md"),
      "---\nname: deploy\ndescription: changed\n---\nChanged.",
    );

    const list = listSkills(workspace);
    strictEqual(list[0].hasPendingChanges, true);
  });

  it("counts files including subdirectories", () => {
    makeSkill("deploy");
    mkdirSync(join(workspace, "skills", "deploy", "scripts"), { recursive: true });
    writeFileSync(join(workspace, "skills", "deploy", "scripts", "run.sh"), "#!/bin/bash");

    const list = listSkills(workspace);
    strictEqual(list[0].fileCount, 2);
  });
});

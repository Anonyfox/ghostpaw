import { strictEqual } from "node:assert";
import { mkdirSync, mkdtempSync, rmSync, unlinkSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, it } from "node:test";
import { checkpoint } from "./checkpoint.ts";
import { resetGitAvailableCache } from "./git.ts";
import { skillDiff } from "./skill_diff.ts";

let workspace: string;

beforeEach(() => {
  resetGitAvailableCache();
  workspace = mkdtempSync(join(tmpdir(), "ghostpaw-diff-"));
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

describe("skillDiff", () => {
  it("returns null when no history exists", () => {
    strictEqual(skillDiff(workspace, "deploy"), null);
  });

  it("returns null when no changes are pending", () => {
    makeSkill("deploy");
    checkpoint(workspace, ["deploy"], "init");
    strictEqual(skillDiff(workspace, "deploy"), null);
  });

  it("returns diff content for a modified file", () => {
    makeSkill("deploy");
    checkpoint(workspace, ["deploy"], "init");

    writeFileSync(
      join(workspace, "skills", "deploy", "SKILL.md"),
      "---\nname: deploy\ndescription: test\n---\nUpdated body.",
    );
    const diff = skillDiff(workspace, "deploy");
    strictEqual(diff !== null, true);
    strictEqual(diff!.includes("Updated body"), true);
  });

  it("reports new untracked files", () => {
    makeSkill("deploy");
    checkpoint(workspace, ["deploy"], "init");

    writeFileSync(join(workspace, "skills", "deploy", "notes.md"), "new notes");
    const diff = skillDiff(workspace, "deploy");
    strictEqual(diff !== null, true);
    strictEqual(diff!.includes("new file"), true);
  });

  it("shows removal in diff for deleted files", () => {
    makeSkill("deploy");
    mkdirSync(join(workspace, "skills", "deploy", "scripts"), { recursive: true });
    writeFileSync(join(workspace, "skills", "deploy", "scripts", "run.sh"), "#!/bin/bash");
    checkpoint(workspace, ["deploy"], "init");

    unlinkSync(join(workspace, "skills", "deploy", "scripts", "run.sh"));
    const diff = skillDiff(workspace, "deploy");
    strictEqual(diff !== null, true);
  });
});

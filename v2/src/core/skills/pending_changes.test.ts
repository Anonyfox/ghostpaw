import { describe, it, beforeEach, afterEach } from "node:test";
import { strictEqual, deepStrictEqual } from "node:assert";
import { mkdtempSync, rmSync, mkdirSync, writeFileSync, unlinkSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { pendingChanges, skillPendingChanges } from "./pending_changes.ts";
import { initHistory } from "./init_history.ts";
import { checkpoint } from "./checkpoint.ts";
import { resetGitAvailableCache } from "./git.ts";

let workspace: string;

beforeEach(() => {
  resetGitAvailableCache();
  workspace = mkdtempSync(join(tmpdir(), "ghostpaw-pending-"));
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

describe("pendingChanges", () => {
  it("returns empty when no history exists", () => {
    const result = pendingChanges(workspace);
    strictEqual(result.totalChanges, 0);
    deepStrictEqual(result.skills, []);
  });

  it("detects a new file in a skill", () => {
    makeSkill("deploy");
    initHistory(workspace);
    checkpoint(workspace, ["deploy"], "init");

    writeFileSync(join(workspace, "skills", "deploy", "notes.md"), "new file");
    const result = pendingChanges(workspace);
    strictEqual(result.totalChanges, 1);
    strictEqual(result.skills.length, 1);
    strictEqual(result.skills[0].name, "deploy");
    deepStrictEqual(result.skills[0].created, ["notes.md"]);
  });

  it("detects a modified SKILL.md", () => {
    makeSkill("deploy");
    initHistory(workspace);
    checkpoint(workspace, ["deploy"], "init");

    writeFileSync(join(workspace, "skills", "deploy", "SKILL.md"), "---\nname: deploy\ndescription: updated\n---\nNew body.");
    const result = pendingChanges(workspace);
    strictEqual(result.skills[0].modified.includes("SKILL.md"), true);
  });

  it("detects a deleted file", () => {
    makeSkill("deploy");
    mkdirSync(join(workspace, "skills", "deploy", "scripts"), { recursive: true });
    writeFileSync(join(workspace, "skills", "deploy", "scripts", "run.sh"), "#!/bin/bash");
    initHistory(workspace);
    checkpoint(workspace, ["deploy"], "init");

    unlinkSync(join(workspace, "skills", "deploy", "scripts", "run.sh"));
    const result = pendingChanges(workspace);
    strictEqual(result.skills[0].deleted.length, 1);
  });

  it("detects changes across multiple skills", () => {
    makeSkill("deploy");
    makeSkill("testing");
    initHistory(workspace);
    checkpoint(workspace, ["deploy", "testing"], "init");

    writeFileSync(join(workspace, "skills", "deploy", "SKILL.md"), "updated");
    writeFileSync(join(workspace, "skills", "testing", "SKILL.md"), "updated");
    const result = pendingChanges(workspace);
    strictEqual(result.skills.length, 2);
    strictEqual(result.totalChanges, 2);
  });

  it("reports untracked files outside skill directories", () => {
    initHistory(workspace);
    writeFileSync(join(workspace, "skills", "README.md"), "info");
    const result = pendingChanges(workspace);
    strictEqual(result.untracked.length, 1);
  });
});

describe("skillPendingChanges", () => {
  it("returns changes for a specific skill", () => {
    makeSkill("deploy");
    makeSkill("testing");
    initHistory(workspace);
    checkpoint(workspace, ["deploy", "testing"], "init");

    writeFileSync(join(workspace, "skills", "deploy", "SKILL.md"), "updated");
    const result = skillPendingChanges(workspace, "deploy");
    strictEqual(result.name, "deploy");
    strictEqual(result.totalChanges, 1);
  });

  it("returns empty for a skill with no changes", () => {
    makeSkill("deploy");
    initHistory(workspace);
    checkpoint(workspace, ["deploy"], "init");

    const result = skillPendingChanges(workspace, "deploy");
    strictEqual(result.totalChanges, 0);
  });
});

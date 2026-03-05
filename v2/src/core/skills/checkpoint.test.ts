import { describe, it, beforeEach, afterEach } from "node:test";
import { strictEqual, throws, deepStrictEqual } from "node:assert";
import { mkdtempSync, rmSync, mkdirSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { checkpoint } from "./checkpoint.ts";
import { initHistory } from "./init_history.ts";
import { resetGitAvailableCache, git } from "./git.ts";

let workspace: string;

beforeEach(() => {
  resetGitAvailableCache();
  workspace = mkdtempSync(join(tmpdir(), "ghostpaw-checkpoint-"));
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

describe("checkpoint", () => {
  it("creates a checkpoint for a single skill", () => {
    makeSkill("deploy");
    const result = checkpoint(workspace, ["deploy"], "initial checkpoint");
    strictEqual(result.committed, true);
    deepStrictEqual(result.skills, ["deploy"]);
    strictEqual(result.message, "initial checkpoint");
    strictEqual(typeof result.commitHash, "string");
  });

  it("creates a checkpoint for multiple skills", () => {
    makeSkill("deploy");
    makeSkill("testing");
    const result = checkpoint(workspace, ["deploy", "testing"], "multi-skill checkpoint");
    strictEqual(result.committed, true);
    strictEqual(result.skills.length, 2);
    strictEqual(result.skills.includes("deploy"), true);
    strictEqual(result.skills.includes("testing"), true);
  });

  it("returns committed: false when no changes to commit", () => {
    makeSkill("deploy");
    checkpoint(workspace, ["deploy"], "first");

    const result = checkpoint(workspace, ["deploy"], "second, no changes");
    strictEqual(result.committed, false);
    deepStrictEqual(result.skills, []);
  });

  it("throws when a named skill directory does not exist", () => {
    throws(
      () => checkpoint(workspace, ["nonexistent"], "oops"),
      /does not exist/,
    );
  });

  it("returns committed: false when skills array is empty", () => {
    const result = checkpoint(workspace, [], "nothing");
    strictEqual(result.committed, false);
  });

  it("initializes history automatically if needed", () => {
    makeSkill("deploy");
    const result = checkpoint(workspace, ["deploy"], "auto-init");
    strictEqual(result.committed, true);
  });

  it("preserves commit message in git log", () => {
    makeSkill("deploy");
    checkpoint(workspace, ["deploy"], "deploy skill created");

    const log = git(workspace, ["log", "--oneline"]);
    strictEqual(log.ok, true);
    strictEqual(log.stdout.includes("deploy skill created"), true);
  });

  it("skips skills with no changes in a multi-skill checkpoint", () => {
    makeSkill("deploy");
    makeSkill("testing");
    checkpoint(workspace, ["deploy", "testing"], "first");

    writeFileSync(join(workspace, "skills", "deploy", "SKILL.md"), "---\nname: deploy\ndescription: updated\n---\nNew body.");
    const result = checkpoint(workspace, ["deploy", "testing"], "update deploy only");
    strictEqual(result.committed, true);
    deepStrictEqual(result.skills, ["deploy"]);
  });
});

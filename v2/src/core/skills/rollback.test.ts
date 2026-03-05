import { describe, it, beforeEach, afterEach } from "node:test";
import { strictEqual } from "node:assert";
import { mkdtempSync, rmSync, mkdirSync, writeFileSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { rollback } from "./rollback.ts";
import { checkpoint } from "./checkpoint.ts";
import { skillHistory } from "./skill_history.ts";
import { resetGitAvailableCache } from "./git.ts";

let workspace: string;

beforeEach(() => {
  resetGitAvailableCache();
  workspace = mkdtempSync(join(tmpdir(), "ghostpaw-rollback-"));
  mkdirSync(join(workspace, "skills"), { recursive: true });
});

afterEach(() => {
  rmSync(workspace, { recursive: true, force: true });
});

function makeSkill(name: string, body: string): void {
  const dir = join(workspace, "skills", name);
  mkdirSync(dir, { recursive: true });
  writeFileSync(join(dir, "SKILL.md"), `---\nname: ${name}\ndescription: test\n---\n${body}`);
}

describe("rollback", () => {
  it("reverts a skill to a previous checkpoint", () => {
    makeSkill("deploy", "Version 1");
    checkpoint(workspace, ["deploy"], "v1");

    writeFileSync(join(workspace, "skills", "deploy", "SKILL.md"), "---\nname: deploy\ndescription: test\n---\nVersion 2");
    checkpoint(workspace, ["deploy"], "v2");

    const history = skillHistory(workspace, "deploy");
    const v1Hash = history[1].hash;
    strictEqual(rollback(workspace, "deploy", v1Hash), true);

    const content = readFileSync(join(workspace, "skills", "deploy", "SKILL.md"), "utf-8");
    strictEqual(content.includes("Version 1"), true);
  });

  it("returns false for an invalid commit ref", () => {
    makeSkill("deploy", "Body");
    checkpoint(workspace, ["deploy"], "init");
    strictEqual(rollback(workspace, "deploy", "nonexistent123"), false);
  });

  it("returns false when no history exists", () => {
    strictEqual(rollback(workspace, "deploy", "abc123"), false);
  });

  it("allows re-checkpoint after rollback", () => {
    makeSkill("deploy", "Version 1");
    checkpoint(workspace, ["deploy"], "v1");

    writeFileSync(join(workspace, "skills", "deploy", "SKILL.md"), "---\nname: deploy\ndescription: test\n---\nVersion 2");
    checkpoint(workspace, ["deploy"], "v2");

    const history = skillHistory(workspace, "deploy");
    rollback(workspace, "deploy", history[1].hash);

    const result = checkpoint(workspace, ["deploy"], "rolled back to v1");
    strictEqual(result.committed, true);
  });
});

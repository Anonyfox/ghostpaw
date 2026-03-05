import { strictEqual } from "node:assert";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, it } from "node:test";
import { checkpoint } from "./checkpoint.ts";
import { resetGitAvailableCache } from "./git.ts";
import { skillHistory } from "./skill_history.ts";

let workspace: string;

beforeEach(() => {
  resetGitAvailableCache();
  workspace = mkdtempSync(join(tmpdir(), "ghostpaw-history-"));
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

describe("skillHistory", () => {
  it("returns empty when no history exists", () => {
    strictEqual(skillHistory(workspace).length, 0);
  });

  it("returns a single entry after one checkpoint", () => {
    makeSkill("deploy");
    checkpoint(workspace, ["deploy"], "initial");
    const entries = skillHistory(workspace, "deploy");
    strictEqual(entries.length, 1);
    strictEqual(entries[0].message, "initial");
    strictEqual(typeof entries[0].hash, "string");
  });

  it("returns entries newest-first", () => {
    makeSkill("deploy");
    checkpoint(workspace, ["deploy"], "first");

    writeFileSync(join(workspace, "skills", "deploy", "SKILL.md"), "v2");
    checkpoint(workspace, ["deploy"], "second");

    const entries = skillHistory(workspace, "deploy");
    strictEqual(entries.length, 2);
    strictEqual(entries[0].message, "second");
    strictEqual(entries[1].message, "first");
  });

  it("filters to a specific skill", () => {
    makeSkill("deploy");
    makeSkill("testing");
    checkpoint(workspace, ["deploy", "testing"], "both");

    writeFileSync(join(workspace, "skills", "deploy", "SKILL.md"), "v2");
    checkpoint(workspace, ["deploy"], "deploy only");

    const deployHistory = skillHistory(workspace, "deploy");
    strictEqual(deployHistory.length, 2);

    const testingHistory = skillHistory(workspace, "testing");
    strictEqual(testingHistory.length, 1);
  });

  it("returns all entries when no name filter", () => {
    makeSkill("deploy");
    makeSkill("testing");
    checkpoint(workspace, ["deploy"], "first");
    checkpoint(workspace, ["testing"], "second");

    const all = skillHistory(workspace);
    strictEqual(all.length, 2);
  });
});

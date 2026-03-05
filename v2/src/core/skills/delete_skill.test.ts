import { strictEqual } from "node:assert";
import { existsSync, mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, it } from "node:test";
import { checkpoint } from "./checkpoint.ts";
import { deleteSkill } from "./delete_skill.ts";
import { resetGitAvailableCache } from "./git.ts";
import { skillHistory } from "./skill_history.ts";

let workspace: string;

beforeEach(() => {
  resetGitAvailableCache();
  workspace = mkdtempSync(join(tmpdir(), "ghostpaw-delete-skill-"));
  mkdirSync(join(workspace, "skills"), { recursive: true });
});

afterEach(() => {
  rmSync(workspace, { recursive: true, force: true });
});

describe("deleteSkill", () => {
  it("deletes an existing skill directory", () => {
    const dir = join(workspace, "skills", "deploy");
    mkdirSync(dir);
    writeFileSync(join(dir, "SKILL.md"), "---\nname: deploy\ndescription: test\n---\nBody.");
    strictEqual(deleteSkill(workspace, "deploy"), true);
    strictEqual(existsSync(dir), false);
  });

  it("returns false for a nonexistent skill", () => {
    strictEqual(deleteSkill(workspace, "nonexistent"), false);
  });

  it("preserves git history after deletion", () => {
    const dir = join(workspace, "skills", "deploy");
    mkdirSync(dir);
    writeFileSync(join(dir, "SKILL.md"), "---\nname: deploy\ndescription: test\n---\nBody.");
    checkpoint(workspace, ["deploy"], "checkpoint before delete");

    deleteSkill(workspace, "deploy");
    const history = skillHistory(workspace, "deploy");
    strictEqual(history.length, 1);
    strictEqual(history[0].message, "checkpoint before delete");
  });
});

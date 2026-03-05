import { describe, it, beforeEach, afterEach } from "node:test";
import { strictEqual } from "node:assert";
import { mkdtempSync, rmSync, mkdirSync, writeFileSync, readFileSync, existsSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { repairSkill, repairFlatFile } from "./repair_skill.ts";

let workspace: string;

beforeEach(() => {
  workspace = mkdtempSync(join(tmpdir(), "ghostpaw-repair-"));
  mkdirSync(join(workspace, "skills"), { recursive: true });
});

afterEach(() => {
  rmSync(workspace, { recursive: true, force: true });
});

describe("repairSkill", () => {
  it("creates SKILL.md when missing", () => {
    mkdirSync(join(workspace, "skills", "empty"), { recursive: true });
    const result = repairSkill(workspace, "empty");
    strictEqual(result.actions.some((a) => a.code === "create-skill-md" && a.applied), true);
    strictEqual(existsSync(join(workspace, "skills", "empty", "SKILL.md")), true);
  });

  it("adds frontmatter when missing", () => {
    const dir = join(workspace, "skills", "legacy");
    mkdirSync(dir);
    writeFileSync(join(dir, "SKILL.md"), "# My Legacy Skill\n\nSome instructions.");
    const result = repairSkill(workspace, "legacy");
    strictEqual(result.actions.some((a) => a.code === "add-frontmatter" && a.applied), true);

    const content = readFileSync(join(dir, "SKILL.md"), "utf-8");
    strictEqual(content.startsWith("---"), true);
    strictEqual(content.includes("name: legacy"), true);
  });

  it("fixes name when missing", () => {
    const dir = join(workspace, "skills", "myskill");
    mkdirSync(dir);
    writeFileSync(join(dir, "SKILL.md"), "---\ndescription: A skill.\n---\n\n# Body");
    const result = repairSkill(workspace, "myskill");
    strictEqual(result.actions.some((a) => a.code === "fix-name" && a.applied), true);

    const content = readFileSync(join(dir, "SKILL.md"), "utf-8");
    strictEqual(content.includes("name: myskill"), true);
  });

  it("fixes name mismatch", () => {
    const dir = join(workspace, "skills", "correct-name");
    mkdirSync(dir);
    writeFileSync(join(dir, "SKILL.md"), "---\nname: wrong-name\ndescription: test\n---\n\n# Body");
    const result = repairSkill(workspace, "correct-name");
    strictEqual(result.actions.some((a) => a.code === "fix-name" && a.applied), true);

    const content = readFileSync(join(dir, "SKILL.md"), "utf-8");
    strictEqual(content.includes("name: correct-name"), true);
  });

  it("removes .git artifact", () => {
    const dir = join(workspace, "skills", "git-issue");
    mkdirSync(dir);
    writeFileSync(join(dir, "SKILL.md"), "---\nname: git-issue\ndescription: test\n---\n\n# Body");
    writeFileSync(join(dir, ".git"), "gitdir: /somewhere");
    const result = repairSkill(workspace, "git-issue");
    strictEqual(result.actions.some((a) => a.code === "remove-git-artifact" && a.applied), true);
    strictEqual(existsSync(join(dir, ".git")), false);
  });

  it("does nothing on a valid skill", () => {
    const dir = join(workspace, "skills", "valid");
    mkdirSync(dir);
    writeFileSync(
      join(dir, "SKILL.md"),
      "---\nname: valid\ndescription: A valid skill.\n---\n\n# Valid\n\nInstructions.",
    );
    const result = repairSkill(workspace, "valid");
    strictEqual(result.actions.length, 0);
    strictEqual(result.remainingIssues.length, 0);
  });

  it("reports remaining non-fixable issues", () => {
    const dir = join(workspace, "skills", "partial");
    mkdirSync(dir);
    writeFileSync(join(dir, "SKILL.md"), "---\nname: partial\n---\n\n# Body");
    const result = repairSkill(workspace, "partial");
    strictEqual(result.remainingIssues.some((i) => i.code === "missing-description"), true);
  });
});

describe("repairFlatFile", () => {
  it("migrates a flat .md file to a skill directory", () => {
    writeFileSync(
      join(workspace, "skills", "legacy.md"),
      "# Legacy Skill\n\nSome instructions.",
    );
    const result = repairFlatFile(workspace, "legacy.md");
    strictEqual(result.actions.some((a) => a.code === "migrate-flat-file" && a.applied), true);
    strictEqual(existsSync(join(workspace, "skills", "legacy", "SKILL.md")), true);
    strictEqual(existsSync(join(workspace, "skills", "legacy.md")), false);

    const content = readFileSync(join(workspace, "skills", "legacy", "SKILL.md"), "utf-8");
    strictEqual(content.includes("---"), true);
    strictEqual(content.includes("Legacy Skill"), true);
  });

  it("skips migration when target directory already exists", () => {
    writeFileSync(join(workspace, "skills", "deploy.md"), "# Deploy");
    mkdirSync(join(workspace, "skills", "deploy"));
    const result = repairFlatFile(workspace, "deploy.md");
    strictEqual(result.actions.some((a) => !a.applied), true);
  });

  it("preserves existing frontmatter during migration", () => {
    writeFileSync(
      join(workspace, "skills", "existing.md"),
      "---\nname: existing\ndescription: Has FM.\n---\n\n# Body",
    );
    repairFlatFile(workspace, "existing.md");
    const content = readFileSync(join(workspace, "skills", "existing", "SKILL.md"), "utf-8");
    strictEqual(content.includes("description: Has FM."), true);
  });
});

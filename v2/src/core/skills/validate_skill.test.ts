import { describe, it, beforeEach, afterEach } from "node:test";
import { strictEqual } from "node:assert";
import { mkdtempSync, rmSync, mkdirSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { validateSkill, validateAllSkills } from "./validate_skill.ts";

let workspace: string;

beforeEach(() => {
  workspace = mkdtempSync(join(tmpdir(), "ghostpaw-validate-"));
  mkdirSync(join(workspace, "skills"), { recursive: true });
});

afterEach(() => {
  rmSync(workspace, { recursive: true, force: true });
});

function makeSkill(name: string, content?: string): void {
  const dir = join(workspace, "skills", name);
  mkdirSync(dir, { recursive: true });
  writeFileSync(
    join(dir, "SKILL.md"),
    content ?? `---\nname: ${name}\ndescription: A test skill.\n---\n\n# ${name}\n\nInstructions.`,
  );
}

describe("validateSkill", () => {
  it("reports no issues for a valid skill", () => {
    makeSkill("deploy");
    const result = validateSkill(workspace, "deploy");
    strictEqual(result.valid, true);
    strictEqual(result.issues.length, 0);
  });

  it("detects missing-skill-md", () => {
    mkdirSync(join(workspace, "skills", "empty"), { recursive: true });
    const result = validateSkill(workspace, "empty");
    strictEqual(result.valid, false);
    strictEqual(result.issues.some((i) => i.code === "missing-skill-md"), true);
    strictEqual(result.issues.find((i) => i.code === "missing-skill-md")?.autoFixable, true);
  });

  it("detects missing-frontmatter", () => {
    makeSkill("legacy", "# Legacy\n\nNo frontmatter here.");
    const result = validateSkill(workspace, "legacy");
    strictEqual(result.issues.some((i) => i.code === "missing-frontmatter"), true);
  });

  it("detects missing-name in frontmatter", () => {
    makeSkill("noname", "---\ndescription: A skill.\n---\n\n# Body");
    const result = validateSkill(workspace, "noname");
    strictEqual(result.issues.some((i) => i.code === "missing-name"), true);
  });

  it("detects missing-description", () => {
    makeSkill("nodesc", "---\nname: nodesc\n---\n\n# Body");
    const result = validateSkill(workspace, "nodesc");
    strictEqual(result.valid, false);
    strictEqual(result.issues.some((i) => i.code === "missing-description"), true);
  });

  it("detects name-mismatch", () => {
    makeSkill("myskill", "---\nname: wrong-name\ndescription: test\n---\n\n# Body");
    const result = validateSkill(workspace, "myskill");
    strictEqual(result.issues.some((i) => i.code === "name-mismatch"), true);
  });

  it("detects invalid-name-chars for uppercase", () => {
    mkdirSync(join(workspace, "skills", "BadName"), { recursive: true });
    writeFileSync(
      join(workspace, "skills", "BadName", "SKILL.md"),
      "---\nname: BadName\ndescription: test\n---\n\n# Body",
    );
    const result = validateSkill(workspace, "BadName");
    strictEqual(result.issues.some((i) => i.code === "invalid-name-chars"), true);
    strictEqual(result.issues.find((i) => i.code === "invalid-name-chars")?.autoFixable, false);
  });

  it("detects invalid-name-chars for underscores", () => {
    mkdirSync(join(workspace, "skills", "bad_name"), { recursive: true });
    writeFileSync(
      join(workspace, "skills", "bad_name", "SKILL.md"),
      "---\nname: bad_name\ndescription: test\n---\n\n# Body",
    );
    const result = validateSkill(workspace, "bad_name");
    strictEqual(result.issues.some((i) => i.code === "invalid-name-chars"), true);
  });

  it("detects empty-body", () => {
    makeSkill("empty-body", "---\nname: empty-body\ndescription: test\n---\n");
    const result = validateSkill(workspace, "empty-body");
    strictEqual(result.issues.some((i) => i.code === "empty-body"), true);
  });

  it("detects oversized-body", () => {
    const longBody = Array.from({ length: 600 }, (_, i) => `Line ${i}`).join("\n");
    makeSkill("big", `---\nname: big\ndescription: test\n---\n\n${longBody}`);
    const result = validateSkill(workspace, "big");
    strictEqual(result.issues.some((i) => i.code === "oversized-body"), true);
    strictEqual(result.valid, true);
  });

  it("detects git-artifact", () => {
    makeSkill("git-issue");
    writeFileSync(join(workspace, "skills", "git-issue", ".git"), "gitdir: /somewhere");
    const result = validateSkill(workspace, "git-issue");
    strictEqual(result.issues.some((i) => i.code === "git-artifact"), true);
  });

  it("reports multiple issues on one skill", () => {
    mkdirSync(join(workspace, "skills", "Bad_Name"), { recursive: true });
    writeFileSync(join(workspace, "skills", "Bad_Name", "SKILL.md"), "No frontmatter here.");
    const result = validateSkill(workspace, "Bad_Name");
    strictEqual(result.issues.length >= 2, true);
  });
});

describe("validateAllSkills", () => {
  it("validates all skill directories", () => {
    makeSkill("deploy");
    makeSkill("testing");
    const results = validateAllSkills(workspace);
    strictEqual(results.length, 2);
    strictEqual(results.every((r) => r.valid), true);
  });

  it("catches flat files at skills/ root", () => {
    writeFileSync(join(workspace, "skills", "legacy.md"), "# Legacy skill");
    const results = validateAllSkills(workspace);
    strictEqual(results.some((r) => r.issues.some((i) => i.code === "flat-file")), true);
  });

  it("returns empty for nonexistent skills/", () => {
    rmSync(join(workspace, "skills"), { recursive: true });
    strictEqual(validateAllSkills(workspace).length, 0);
  });
});

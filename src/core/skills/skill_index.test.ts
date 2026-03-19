import { deepStrictEqual, strictEqual } from "node:assert";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, it } from "node:test";
import { checkpoint } from "./checkpoint.ts";
import { resetGitAvailableCache } from "./git.ts";
import { buildSkillIndex, formatSkillIndex } from "./skill_index.ts";

let workspace: string;

beforeEach(() => {
  resetGitAvailableCache();
  workspace = mkdtempSync(join(tmpdir(), "ghostpaw-index-"));
});

afterEach(() => {
  rmSync(workspace, { recursive: true, force: true });
});

function makeSkill(name: string, description?: string): void {
  const dir = join(workspace, "skills", name);
  mkdirSync(dir, { recursive: true });
  writeFileSync(
    join(dir, "SKILL.md"),
    `---\nname: ${name}\ndescription: ${description ?? "A test skill."}\n---\n\n# ${name}`,
  );
}

describe("buildSkillIndex", () => {
  it("returns empty when skills/ does not exist", () => {
    deepStrictEqual(buildSkillIndex(workspace), []);
  });

  it("returns entries for checkpointed skills", () => {
    makeSkill("deploy", "Deploy the app.");
    makeSkill("testing", "Run tests.");
    checkpoint(workspace, ["deploy", "testing"], "init");
    const entries = buildSkillIndex(workspace);
    strictEqual(entries.length, 2);
    strictEqual(entries[0].name, "deploy");
    strictEqual(entries[0].description, "Deploy the app.");
    strictEqual(entries[1].name, "testing");
  });

  it("excludes uncheckpointed (rank 0) skills", () => {
    makeSkill("visible", "Visible skill.");
    checkpoint(workspace, ["visible"], "init");
    makeSkill("invisible", "Not checkpointed.");
    const entries = buildSkillIndex(workspace);
    strictEqual(entries.length, 1);
    strictEqual(entries[0].name, "visible");
  });

  it("uses '(no description)' for skills without description", () => {
    const dir = join(workspace, "skills", "nodesc");
    mkdirSync(dir, { recursive: true });
    writeFileSync(join(dir, "SKILL.md"), "---\nname: nodesc\n---\n");
    checkpoint(workspace, ["nodesc"], "init");
    const entries = buildSkillIndex(workspace);
    strictEqual(entries[0].description, "(no description)");
  });

  it("falls back to heading when no frontmatter", () => {
    const dir = join(workspace, "skills", "legacy");
    mkdirSync(dir, { recursive: true });
    writeFileSync(join(dir, "SKILL.md"), "# My Great Skill\n\nBody.");
    checkpoint(workspace, ["legacy"], "init");
    const entries = buildSkillIndex(workspace);
    strictEqual(entries[0].description, "My Great Skill");
  });
});

describe("formatSkillIndex", () => {
  it("returns empty string for empty entries", () => {
    strictEqual(formatSkillIndex([]), "");
  });

  it("formats a single entry with tier label", () => {
    const result = formatSkillIndex([
      { name: "deploy", description: "Deploy the app.", tier: "Apprentice" },
    ]);
    strictEqual(result.includes("## Skills"), true);
    strictEqual(result.includes("1 skill"), true);
    strictEqual(result.includes("skills/deploy/ [Apprentice]: Deploy the app."), true);
  });

  it("formats multiple entries with correct plural", () => {
    const result = formatSkillIndex([
      { name: "deploy", description: "Deploy.", tier: "Expert" },
      { name: "testing", description: "Test.", tier: "Journeyman" },
    ]);
    strictEqual(result.includes("2 skills"), true);
    strictEqual(result.includes("skills/deploy/ [Expert]"), true);
    strictEqual(result.includes("skills/testing/ [Journeyman]"), true);
  });
});

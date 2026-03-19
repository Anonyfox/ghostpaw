import { deepStrictEqual } from "node:assert";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, it } from "node:test";
import { discoverSkills } from "./discover_skills.ts";

let workspace: string;

beforeEach(() => {
  workspace = mkdtempSync(join(tmpdir(), "ghostpaw-discover-"));
});

afterEach(() => {
  rmSync(workspace, { recursive: true, force: true });
});

function makeSkill(name: string): void {
  const dir = join(workspace, "skills", name);
  mkdirSync(dir, { recursive: true });
  writeFileSync(join(dir, "SKILL.md"), `---\nname: ${name}\ndescription: test\n---\n`);
}

describe("discoverSkills", () => {
  it("returns empty when skills/ does not exist", () => {
    deepStrictEqual(discoverSkills(workspace), []);
  });

  it("returns empty when skills/ is empty", () => {
    mkdirSync(join(workspace, "skills"));
    deepStrictEqual(discoverSkills(workspace), []);
  });

  it("discovers multiple valid skills sorted by name", () => {
    makeSkill("testing");
    makeSkill("deploy");
    makeSkill("analytics");
    deepStrictEqual(discoverSkills(workspace), ["analytics", "deploy", "testing"]);
  });

  it("ignores directories without SKILL.md", () => {
    mkdirSync(join(workspace, "skills", "empty-dir"), { recursive: true });
    makeSkill("valid");
    deepStrictEqual(discoverSkills(workspace), ["valid"]);
  });

  it("ignores flat .md files at skills/ root", () => {
    mkdirSync(join(workspace, "skills"), { recursive: true });
    writeFileSync(join(workspace, "skills", "legacy.md"), "# Legacy skill");
    makeSkill("valid");
    deepStrictEqual(discoverSkills(workspace), ["valid"]);
  });

  it("ignores hidden directories", () => {
    mkdirSync(join(workspace, "skills", ".hidden"), { recursive: true });
    writeFileSync(join(workspace, "skills", ".hidden", "SKILL.md"), "---\nname: hidden\n---\n");
    makeSkill("visible");
    deepStrictEqual(discoverSkills(workspace), ["visible"]);
  });
});

import { deepStrictEqual, strictEqual } from "node:assert";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, it } from "node:test";
import { parseSkill } from "./parse_skill.ts";

let workspace: string;

beforeEach(() => {
  workspace = mkdtempSync(join(tmpdir(), "ghostpaw-parse-skill-"));
  mkdirSync(join(workspace, "skills"), { recursive: true });
});

afterEach(() => {
  rmSync(workspace, { recursive: true, force: true });
});

describe("parseSkill", () => {
  it("parses a valid skill with all subdirectories", () => {
    const dir = join(workspace, "skills", "deploy");
    mkdirSync(dir);
    mkdirSync(join(dir, "scripts"));
    mkdirSync(join(dir, "references"));
    mkdirSync(join(dir, "assets"));
    writeFileSync(
      join(dir, "SKILL.md"),
      `---
name: deploy
description: Deploy the app.
---

# Deploy

Steps here.`,
    );
    writeFileSync(join(dir, "scripts", "run.sh"), "#!/bin/bash\necho hi");
    writeFileSync(join(dir, "references", "setup.md"), "# Setup");
    writeFileSync(join(dir, "assets", "template.json"), "{}");

    const skill = parseSkill(workspace, "deploy");
    strictEqual(skill?.name, "deploy");
    strictEqual(skill?.description, "Deploy the app.");
    strictEqual(skill?.body, "# Deploy\n\nSteps here.");
    deepStrictEqual(skill?.files.scripts, ["run.sh"]);
    deepStrictEqual(skill?.files.references, ["setup.md"]);
    deepStrictEqual(skill?.files.assets, ["template.json"]);
    strictEqual(skill?.path, "skills/deploy");
    strictEqual(skill?.skillMdPath, "skills/deploy/SKILL.md");
  });

  it("parses a skill with only SKILL.md", () => {
    const dir = join(workspace, "skills", "simple");
    mkdirSync(dir);
    writeFileSync(
      join(dir, "SKILL.md"),
      `---
name: simple
description: A simple skill.
---

# Simple Skill`,
    );

    const skill = parseSkill(workspace, "simple");
    strictEqual(skill?.name, "simple");
    deepStrictEqual(skill?.files.scripts, []);
    deepStrictEqual(skill?.files.references, []);
    deepStrictEqual(skill?.files.assets, []);
    deepStrictEqual(skill?.files.other, []);
  });

  it("returns null when SKILL.md is missing", () => {
    const dir = join(workspace, "skills", "empty");
    mkdirSync(dir);
    strictEqual(parseSkill(workspace, "empty"), null);
  });

  it("returns null when directory does not exist", () => {
    strictEqual(parseSkill(workspace, "nonexistent"), null);
  });

  it("falls back to heading extraction when frontmatter is missing", () => {
    const dir = join(workspace, "skills", "legacy");
    mkdirSync(dir);
    writeFileSync(join(dir, "SKILL.md"), "# Deploy to Production\n\nSome instructions.");

    const skill = parseSkill(workspace, "legacy");
    strictEqual(skill?.name, "legacy");
    strictEqual(skill?.description, "Deploy to Production");
  });

  it("handles empty SKILL.md", () => {
    const dir = join(workspace, "skills", "blank");
    mkdirSync(dir);
    writeFileSync(join(dir, "SKILL.md"), "");

    const skill = parseSkill(workspace, "blank");
    strictEqual(skill?.name, "blank");
    strictEqual(skill?.description, "(no description)");
    strictEqual(skill?.body, "");
  });

  it("classifies non-standard files as other", () => {
    const dir = join(workspace, "skills", "mixed");
    mkdirSync(dir);
    writeFileSync(
      join(dir, "SKILL.md"),
      `---
name: mixed
description: Has extra files.
---

Body.`,
    );
    writeFileSync(join(dir, "notes.txt"), "some notes");
    writeFileSync(join(dir, "helper.py"), "print('hi')");

    const skill = parseSkill(workspace, "mixed");
    deepStrictEqual(skill?.files.other.sort(), ["helper.py", "notes.txt"]);
  });
});

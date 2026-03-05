import { strictEqual } from "node:assert";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, it } from "node:test";
import { getSkill } from "./get_skill.ts";

let workspace: string;

beforeEach(() => {
  workspace = mkdtempSync(join(tmpdir(), "ghostpaw-get-skill-"));
  mkdirSync(join(workspace, "skills"), { recursive: true });
});

afterEach(() => {
  rmSync(workspace, { recursive: true, force: true });
});

describe("getSkill", () => {
  it("returns a parsed skill for an existing skill", () => {
    const dir = join(workspace, "skills", "deploy");
    mkdirSync(dir);
    writeFileSync(
      join(dir, "SKILL.md"),
      `---
name: deploy
description: Deploy the app.
---

# Deploy`,
    );

    const skill = getSkill(workspace, "deploy");
    strictEqual(skill?.name, "deploy");
    strictEqual(skill?.description, "Deploy the app.");
  });

  it("returns null for a nonexistent skill", () => {
    strictEqual(getSkill(workspace, "nope"), null);
  });

  it("returns full file listing for a skill with optional directories", () => {
    const dir = join(workspace, "skills", "full");
    mkdirSync(join(dir, "scripts"), { recursive: true });
    mkdirSync(join(dir, "references"), { recursive: true });
    mkdirSync(join(dir, "assets"), { recursive: true });
    writeFileSync(join(dir, "SKILL.md"), `---\nname: full\ndescription: Full.\n---\n# Full`);
    writeFileSync(join(dir, "scripts", "run.sh"), "");
    writeFileSync(join(dir, "assets", "tmpl.json"), "");

    const skill = getSkill(workspace, "full");
    strictEqual(skill?.files.scripts.length, 1);
    strictEqual(skill?.files.assets.length, 1);
    strictEqual(skill?.files.references.length, 0);
  });
});

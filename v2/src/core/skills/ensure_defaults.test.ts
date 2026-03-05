import { describe, it, beforeEach, afterEach } from "node:test";
import { strictEqual } from "node:assert";
import { mkdtempSync, rmSync, mkdirSync, writeFileSync, existsSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { ensureDefaults } from "./ensure_defaults.ts";
import { DEFAULT_SKILLS } from "./defaults.ts";

let workspace: string;

beforeEach(() => {
  workspace = mkdtempSync(join(tmpdir(), "ghostpaw-ensure-defaults-"));
});

afterEach(() => {
  rmSync(workspace, { recursive: true, force: true });
});

describe("ensureDefaults", () => {
  it("creates all defaults on an empty workspace", () => {
    const created = ensureDefaults(workspace);
    strictEqual(created.length, Object.keys(DEFAULT_SKILLS).length);

    for (const name of Object.keys(DEFAULT_SKILLS)) {
      strictEqual(existsSync(join(workspace, "skills", name, "SKILL.md")), true);
    }
  });

  it("does not overwrite existing skills", () => {
    const dir = join(workspace, "skills", "skill-training");
    mkdirSync(dir, { recursive: true });
    writeFileSync(join(dir, "SKILL.md"), "custom content");

    ensureDefaults(workspace);

    const content = readFileSync(join(dir, "SKILL.md"), "utf-8");
    strictEqual(content, "custom content");
  });

  it("creates only missing defaults when some exist", () => {
    const dir = join(workspace, "skills", "skill-training");
    mkdirSync(dir, { recursive: true });
    writeFileSync(join(dir, "SKILL.md"), "existing");

    const created = ensureDefaults(workspace);
    strictEqual(created.includes("skill-training"), false);
    strictEqual(created.length, Object.keys(DEFAULT_SKILLS).length - 1);
  });

  it("creates the skills/ directory if missing", () => {
    strictEqual(existsSync(join(workspace, "skills")), false);
    ensureDefaults(workspace);
    strictEqual(existsSync(join(workspace, "skills")), true);
  });

  it("writes valid SKILL.md with frontmatter", () => {
    ensureDefaults(workspace);
    const content = readFileSync(join(workspace, "skills", "skill-scout", "SKILL.md"), "utf-8");
    strictEqual(content.startsWith("---"), true);
    strictEqual(content.includes("name: skill-scout"), true);
    strictEqual(content.includes("description:"), true);
  });
});

import { strictEqual } from "node:assert";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, it } from "node:test";
import { DEFAULT_SKILLS } from "./defaults.ts";
import { ensureDefaults } from "./ensure_defaults.ts";

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
    const dir = join(workspace, "skills", "effective-writing");
    mkdirSync(dir, { recursive: true });
    writeFileSync(join(dir, "SKILL.md"), "custom content");

    ensureDefaults(workspace);

    const content = readFileSync(join(dir, "SKILL.md"), "utf-8");
    strictEqual(content, "custom content");
  });

  it("creates only missing defaults when some exist", () => {
    const dir = join(workspace, "skills", "effective-writing");
    mkdirSync(dir, { recursive: true });
    writeFileSync(join(dir, "SKILL.md"), "existing");

    const created = ensureDefaults(workspace);
    strictEqual(created.includes("effective-writing"), false);
    strictEqual(created.length, Object.keys(DEFAULT_SKILLS).length - 1);
  });

  it("creates the skills/ directory if missing", () => {
    strictEqual(existsSync(join(workspace, "skills")), false);
    ensureDefaults(workspace);
    strictEqual(existsSync(join(workspace, "skills")), true);
  });

  it("writes valid SKILL.md with frontmatter", () => {
    ensureDefaults(workspace);
    const content = readFileSync(join(workspace, "skills", "skill-mcp", "SKILL.md"), "utf-8");
    strictEqual(content.startsWith("---"), true);
    strictEqual(content.includes("name: skill-mcp"), true);
    strictEqual(content.includes("description:"), true);
  });
});

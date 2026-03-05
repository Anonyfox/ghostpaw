import { strictEqual, throws } from "node:assert";
import { existsSync, mkdirSync, mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, it } from "node:test";
import { createSkill } from "./create_skill.ts";
import { parseSkill } from "./parse_skill.ts";

let workspace: string;

beforeEach(() => {
  workspace = mkdtempSync(join(tmpdir(), "ghostpaw-create-skill-"));
  mkdirSync(join(workspace, "skills"), { recursive: true });
});

afterEach(() => {
  rmSync(workspace, { recursive: true, force: true });
});

describe("createSkill", () => {
  it("creates a basic skill", () => {
    const skill = createSkill(workspace, {
      name: "deploy",
      description: "Deploy the app.",
      body: "# Deploy\n\nSteps here.",
    });
    strictEqual(skill.name, "deploy");
    strictEqual(skill.description, "Deploy the app.");
    strictEqual(existsSync(join(workspace, "skills", "deploy", "SKILL.md")), true);
  });

  it("creates optional subdirectories", () => {
    createSkill(workspace, {
      name: "with-dirs",
      description: "Has dirs.",
      scripts: true,
      references: true,
    });
    strictEqual(existsSync(join(workspace, "skills", "with-dirs", "scripts")), true);
    strictEqual(existsSync(join(workspace, "skills", "with-dirs", "references")), true);
  });

  it("throws if skill already exists", () => {
    createSkill(workspace, { name: "existing", description: "First." });
    throws(
      () => createSkill(workspace, { name: "existing", description: "Second." }),
      /already exists/,
    );
  });

  it("throws for invalid name", () => {
    throws(
      () => createSkill(workspace, { name: "Bad_Name", description: "test" }),
      /Invalid skill name/,
    );
  });

  it("throws for missing description", () => {
    throws(
      () => createSkill(workspace, { name: "test", description: "" }),
      /description is required/,
    );
  });

  it("creates a SKILL.md parseable by parseSkill", () => {
    createSkill(workspace, { name: "roundtrip", description: "Roundtrip test." });
    const parsed = parseSkill(workspace, "roundtrip");
    strictEqual(parsed?.name, "roundtrip");
    strictEqual(parsed?.description, "Roundtrip test.");
  });
});

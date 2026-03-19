import { ok, strictEqual } from "node:assert";
import { mkdirSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { afterEach, beforeEach, describe, it } from "node:test";
import { createValidateSkillsTool } from "./validate_skills.ts";

let workspace: string;
let tool: ReturnType<typeof createValidateSkillsTool>;

beforeEach(() => {
  workspace = join(process.env.TMPDIR ?? "/tmp", `trainer-validate-${Date.now()}`);
  mkdirSync(join(workspace, "skills", "deploy"), { recursive: true });
  writeFileSync(
    join(workspace, "skills", "deploy", "SKILL.md"),
    "---\nname: deploy\ndescription: Deploy workflow\n---\n\n# Deploy\n\nSteps.\n",
  );
  tool = createValidateSkillsTool(workspace);
});

afterEach(() => {
  rmSync(workspace, { recursive: true, force: true });
});

describe("validate_skills tool", () => {
  it("has correct name", () => {
    strictEqual(tool.name, "validate_skills");
  });

  it("validates a well-formed skill", async () => {
    const result = (await tool.execute({
      args: {},
      ctx: { model: "test", provider: "openai" },
    })) as Record<string, unknown>;
    strictEqual(result.total, 1);
    strictEqual(result.valid, 1);
    strictEqual(result.invalid, 0);
  });

  it("detects invalid skill (missing SKILL.md)", async () => {
    mkdirSync(join(workspace, "skills", "broken"), { recursive: true });
    writeFileSync(join(workspace, "skills", "broken", "notes.txt"), "not a skill");
    const result = (await tool.execute({
      args: {},
      ctx: { model: "test", provider: "openai" },
    })) as Record<string, unknown>;
    strictEqual(result.total, 2);
    ok((result.invalid as number) > 0);
  });
});

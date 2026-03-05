import { ok, strictEqual } from "node:assert";
import { mkdirSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { afterEach, beforeEach, describe, it } from "node:test";
import { initHistory } from "../../core/skills/index.ts";
import { createCheckpointSkillsTool } from "./checkpoint_skills.ts";

let workspace: string;
let tool: ReturnType<typeof createCheckpointSkillsTool>;

beforeEach(() => {
  workspace = join(process.env.TMPDIR ?? "/tmp", `trainer-checkpoint-${Date.now()}`);
  mkdirSync(join(workspace, "skills", "deploy"), { recursive: true });
  writeFileSync(
    join(workspace, "skills", "deploy", "SKILL.md"),
    "---\nname: deploy\ndescription: Deploy\n---\n\n# Deploy\n",
  );
  initHistory(workspace);
  tool = createCheckpointSkillsTool(workspace);
});

afterEach(() => {
  rmSync(workspace, { recursive: true, force: true });
});

describe("checkpoint_skills tool", () => {
  it("has correct name", () => {
    strictEqual(tool.name, "checkpoint_skills");
  });

  it("checkpoints a skill", async () => {
    const result = (await tool.execute({
      args: { skills: '["deploy"]', message: "Initial deploy skill" },
      ctx: { model: "test", provider: "openai" },
    })) as Record<string, unknown>;
    ok(!result.error, `Unexpected error: ${result.error}`);
  });

  it("rejects missing skills param", async () => {
    const result = (await tool.execute({
      args: { message: "test" },
      ctx: { model: "test", provider: "openai" },
    })) as Record<string, unknown>;
    ok(result.error);
  });

  it("rejects missing message", async () => {
    const result = (await tool.execute({
      args: { skills: '["deploy"]' },
      ctx: { model: "test", provider: "openai" },
    })) as Record<string, unknown>;
    ok(result.error);
  });

  it("rejects invalid JSON", async () => {
    const result = (await tool.execute({
      args: { skills: "not json", message: "test" },
      ctx: { model: "test", provider: "openai" },
    })) as Record<string, unknown>;
    ok(result.error);
  });

  it("rejects non-array JSON", async () => {
    const result = (await tool.execute({
      args: { skills: '{"a":1}', message: "test" },
      ctx: { model: "test", provider: "openai" },
    })) as Record<string, unknown>;
    ok(result.error);
  });
});

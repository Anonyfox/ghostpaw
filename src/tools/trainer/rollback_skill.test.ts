import { ok, strictEqual } from "node:assert";
import { mkdirSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { afterEach, beforeEach, describe, it } from "node:test";
import { createRollbackSkillTool } from "./rollback_skill.ts";

let workspace: string;
let tool: ReturnType<typeof createRollbackSkillTool>;

beforeEach(() => {
  workspace = join(process.env.TMPDIR ?? "/tmp", `trainer-rollback-${Date.now()}`);
  mkdirSync(join(workspace, "skills", "deploy"), { recursive: true });
  writeFileSync(
    join(workspace, "skills", "deploy", "SKILL.md"),
    "---\nname: deploy\ndescription: Deploy\n---\n\n# Deploy\n",
  );
  tool = createRollbackSkillTool(workspace);
});

afterEach(() => {
  rmSync(workspace, { recursive: true, force: true });
});

describe("rollback_skill tool", () => {
  it("has correct name", () => {
    strictEqual(tool.name, "rollback_skill");
  });

  it("rejects empty name", async () => {
    const result = (await tool.execute({
      args: { name: "", hash: "abc123" },
      ctx: { model: "test", provider: "openai" },
    })) as Record<string, unknown>;
    ok(result.error);
  });

  it("rejects empty hash", async () => {
    const result = (await tool.execute({
      args: { name: "deploy", hash: "" },
      ctx: { model: "test", provider: "openai" },
    })) as Record<string, unknown>;
    ok(result.error);
  });

  it("returns error for nonexistent hash", async () => {
    const result = (await tool.execute({
      args: { name: "deploy", hash: "deadbeef" },
      ctx: { model: "test", provider: "openai" },
    })) as Record<string, unknown>;
    ok(result.error);
  });
});

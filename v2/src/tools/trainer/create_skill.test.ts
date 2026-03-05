import { ok, strictEqual } from "node:assert";
import { existsSync, mkdirSync, rmSync } from "node:fs";
import { join } from "node:path";
import { afterEach, beforeEach, describe, it } from "node:test";
import { createCreateSkillTool } from "./create_skill.ts";

let workspace: string;
let tool: ReturnType<typeof createCreateSkillTool>;

beforeEach(() => {
  workspace = join(process.env.TMPDIR ?? "/tmp", `trainer-create-${Date.now()}`);
  mkdirSync(join(workspace, "skills"), { recursive: true });
  tool = createCreateSkillTool(workspace);
});

afterEach(() => {
  rmSync(workspace, { recursive: true, force: true });
});

describe("create_skill tool", () => {
  it("has correct name", () => {
    strictEqual(tool.name, "create_skill");
  });

  it("creates a skill folder", async () => {
    const result = (await tool.execute({
      args: { name: "deploy", description: "Deploy workflow" },
      ctx: { model: "test", provider: "openai" },
    })) as Record<string, unknown>;
    strictEqual(result.created, true);
    strictEqual(result.name, "deploy");
    ok(existsSync(join(workspace, "skills", "deploy", "SKILL.md")));
  });

  it("creates a skill with body", async () => {
    const result = (await tool.execute({
      args: { name: "testing", description: "Test runner", body: "# Testing\n\nRun tests." },
      ctx: { model: "test", provider: "openai" },
    })) as Record<string, unknown>;
    strictEqual(result.created, true);
  });

  it("rejects invalid name", async () => {
    const result = (await tool.execute({
      args: { name: "Bad Name", description: "test" },
      ctx: { model: "test", provider: "openai" },
    })) as Record<string, unknown>;
    ok(result.error);
  });

  it("rejects empty description", async () => {
    const result = (await tool.execute({
      args: { name: "valid", description: "" },
      ctx: { model: "test", provider: "openai" },
    })) as Record<string, unknown>;
    ok(result.error);
  });

  it("rejects duplicate name", async () => {
    mkdirSync(join(workspace, "skills", "existing"), { recursive: true });
    const result = (await tool.execute({
      args: { name: "existing", description: "test" },
      ctx: { model: "test", provider: "openai" },
    })) as Record<string, unknown>;
    ok(result.error);
  });
});

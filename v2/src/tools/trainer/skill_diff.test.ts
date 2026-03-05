import { ok, strictEqual } from "node:assert";
import { mkdirSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { afterEach, beforeEach, describe, it } from "node:test";
import { createSkillDiffTool } from "./skill_diff.ts";

let workspace: string;
let tool: ReturnType<typeof createSkillDiffTool>;

beforeEach(() => {
  workspace = join(process.env.TMPDIR ?? "/tmp", `trainer-diff-${Date.now()}`);
  mkdirSync(join(workspace, "skills", "deploy"), { recursive: true });
  writeFileSync(
    join(workspace, "skills", "deploy", "SKILL.md"),
    "---\nname: deploy\ndescription: Deploy\n---\n\n# Deploy\n",
  );
  tool = createSkillDiffTool(workspace);
});

afterEach(() => {
  rmSync(workspace, { recursive: true, force: true });
});

describe("skill_diff tool", () => {
  it("has correct name", () => {
    strictEqual(tool.name, "skill_diff");
  });

  it("returns no changes message when no git history", async () => {
    const result = (await tool.execute({ args: { name: "deploy" }, id: "1" })) as Record<
      string,
      unknown
    >;
    strictEqual(result.name, "deploy");
    ok(typeof result.diff === "string");
  });

  it("rejects empty name", async () => {
    const result = (await tool.execute({ args: { name: "" }, id: "1" })) as Record<
      string,
      unknown
    >;
    ok(result.error);
  });
});

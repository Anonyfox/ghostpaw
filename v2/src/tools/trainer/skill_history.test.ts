import { deepStrictEqual, ok, strictEqual } from "node:assert";
import { mkdirSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { afterEach, beforeEach, describe, it } from "node:test";
import { createSkillHistoryTool } from "./skill_history.ts";

let workspace: string;
let tool: ReturnType<typeof createSkillHistoryTool>;

beforeEach(() => {
  workspace = join(process.env.TMPDIR ?? "/tmp", `trainer-history-${Date.now()}`);
  mkdirSync(join(workspace, "skills", "deploy"), { recursive: true });
  writeFileSync(
    join(workspace, "skills", "deploy", "SKILL.md"),
    "---\nname: deploy\ndescription: Deploy\n---\n\n# Deploy\n",
  );
  tool = createSkillHistoryTool(workspace);
});

afterEach(() => {
  rmSync(workspace, { recursive: true, force: true });
});

describe("skill_history tool", () => {
  it("has correct name", () => {
    strictEqual(tool.name, "skill_history");
  });

  it("returns empty history when no git repo", async () => {
    const result = (await tool.execute({ args: { name: "deploy" }, id: "1" })) as Record<
      string,
      unknown
    >;
    strictEqual(result.name, "deploy");
    deepStrictEqual(result.entries, []);
    ok(result.message);
  });

  it("rejects empty name", async () => {
    const result = (await tool.execute({ args: { name: "" }, id: "1" })) as Record<
      string,
      unknown
    >;
    ok(result.error);
  });
});

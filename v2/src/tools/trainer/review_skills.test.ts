import { deepStrictEqual, ok, strictEqual } from "node:assert";
import { mkdirSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { afterEach, beforeEach, describe, it } from "node:test";
import { createReviewSkillsTool } from "./review_skills.ts";

let workspace: string;
let tool: ReturnType<typeof createReviewSkillsTool>;

beforeEach(() => {
  workspace = join(process.env.TMPDIR ?? "/tmp", `trainer-review-${Date.now()}`);
  mkdirSync(join(workspace, "skills", "deploy"), { recursive: true });
  writeFileSync(
    join(workspace, "skills", "deploy", "SKILL.md"),
    "---\nname: deploy\ndescription: Deploy workflow\n---\n\n# Deploy\n\nSteps here.\n",
  );
  tool = createReviewSkillsTool(workspace);
});

afterEach(() => {
  rmSync(workspace, { recursive: true, force: true });
});

describe("review_skills tool", () => {
  it("has correct name", () => {
    strictEqual(tool.name, "review_skills");
  });

  it("returns skill overview", async () => {
    const result = (await tool.execute({ args: {}, id: "1" })) as Record<string, unknown>;
    strictEqual(result.skillCount, 1);
    ok(Array.isArray(result.skills));
    const skills = result.skills as Array<Record<string, unknown>>;
    strictEqual(skills[0].name, "deploy");
    strictEqual(skills[0].description, "Deploy workflow");
  });

  it("returns empty when no skills", async () => {
    rmSync(join(workspace, "skills"), { recursive: true, force: true });
    mkdirSync(join(workspace, "skills"), { recursive: true });
    const result = (await tool.execute({ args: {}, id: "1" })) as Record<string, unknown>;
    strictEqual(result.skillCount, 0);
    deepStrictEqual(result.skills, []);
  });
});

import assert from "node:assert";
import { describe, it } from "node:test";
import { createAffinitySkillsTool, getAffinitySkill, listAffinitySkills } from "./skills.ts";

describe("listAffinitySkills", () => {
  it("returns an array of skill summaries", () => {
    const skills = listAffinitySkills();
    assert.ok(Array.isArray(skills));
    assert.ok(skills.length > 0, "should have at least one skill");
    for (const s of skills) {
      assert.strictEqual(typeof s.name, "string");
      assert.strictEqual(typeof s.description, "string");
    }
  });
});

describe("getAffinitySkill", () => {
  it("returns content for a known skill", () => {
    const skills = listAffinitySkills();
    const first = skills[0];
    const content = getAffinitySkill(first.name);
    assert.strictEqual(typeof content, "string");
    assert.ok(content!.length > 0);
  });

  it("returns undefined for an unknown skill", () => {
    const content = getAffinitySkill("nonexistent-skill-that-should-not-exist");
    assert.strictEqual(content, undefined);
  });
});

describe("createAffinitySkillsTool", () => {
  it("creates a tool with correct name and schema", () => {
    const tool = createAffinitySkillsTool();
    assert.strictEqual(tool.name, "affinity_skills");

    const schema = (tool as { getParametersSchema(): unknown }).getParametersSchema();
    assert.strictEqual(typeof schema, "object");
  });

  it("list action returns skill summaries", async () => {
    // biome-ignore lint/suspicious/noExplicitAny: duck-typed tool in test
    const tool = createAffinitySkillsTool() as any;
    const result = await tool.executeCall({
      id: "test-1",
      name: "affinity_skills",
      args: { action: "list" },
    });
    assert.ok(result);
    const r = result as {
      id: string;
      result: { skills: unknown[]; count: number };
      success: boolean;
    };
    assert.strictEqual(r.success, true);
    assert.ok(r.result.count > 0);
    assert.strictEqual(r.result.skills.length, r.result.count);
  });

  it("read action returns a known skill", async () => {
    // biome-ignore lint/suspicious/noExplicitAny: duck-typed tool in test
    const tool = createAffinitySkillsTool() as any;
    const skills = listAffinitySkills();
    const result = await tool.executeCall({
      id: "test-2",
      name: "affinity_skills",
      args: { action: "read", name: skills[0].name },
    });
    const r = result as { id: string; result: { name: string; content: string }; success: boolean };
    assert.strictEqual(r.success, true);
    assert.strictEqual(r.result.name, skills[0].name);
    assert.ok(r.result.content.length > 0);
  });

  it("read action returns error for unknown skill", async () => {
    // biome-ignore lint/suspicious/noExplicitAny: duck-typed tool in test
    const tool = createAffinitySkillsTool() as any;
    const result = await tool.executeCall({
      id: "test-3",
      name: "affinity_skills",
      args: { action: "read", name: "nope" },
    });
    const r = result as { id: string; result: { error: string }; success: boolean };
    assert.strictEqual(r.success, false);
    assert.ok(r.result.error.includes("nope"));
  });
});

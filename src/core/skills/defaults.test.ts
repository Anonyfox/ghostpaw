import { strictEqual } from "node:assert";
import { describe, it } from "node:test";
import { DEFAULT_SKILLS } from "./defaults.ts";

const VALID_NAME = /^[a-z0-9]+(-[a-z0-9]+)*$/;

describe("DEFAULT_SKILLS", () => {
  it("contains all default skills", () => {
    const names = Object.keys(DEFAULT_SKILLS);
    strictEqual(names.includes("effective-writing"), true);
    strictEqual(names.includes("reverse-proxy"), true);
    strictEqual(names.includes("skill-mcp"), true);
    strictEqual(names.length, 3);
  });

  for (const [name, skill] of Object.entries(DEFAULT_SKILLS)) {
    it(`"${name}" has a valid name per AgentSkills spec`, () => {
      strictEqual(VALID_NAME.test(name), true);
    });

    it(`"${name}" has a non-empty description`, () => {
      strictEqual(skill.description.length > 0, true);
    });

    it(`"${name}" has a non-empty body`, () => {
      strictEqual(skill.body.length > 0, true);
    });
  }
});

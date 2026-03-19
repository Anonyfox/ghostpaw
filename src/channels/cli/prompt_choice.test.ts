import { strictEqual } from "node:assert";
import { describe, it } from "node:test";
import { promptChoice, promptSkillPick } from "./prompt_choice.ts";

describe("prompt_choice exports", () => {
  it("exports promptChoice as a function", () => {
    strictEqual(typeof promptChoice, "function");
  });

  it("exports promptSkillPick as a function", () => {
    strictEqual(typeof promptSkillPick, "function");
  });
});

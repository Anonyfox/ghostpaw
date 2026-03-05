import { strictEqual } from "node:assert";
import { describe, it } from "node:test";
import { buildScoutExecutePrompt, buildScoutProposePrompt } from "./trainer_scout_prompt.ts";

describe("buildScoutProposePrompt", () => {
  it("builds a directionless prompt for friction mining", () => {
    const prompt = buildScoutProposePrompt();
    strictEqual(prompt.includes("Analyze the current skill library"), true);
    strictEqual(prompt.includes("frustrations"), true);
    strictEqual(prompt.includes("Do NOT create"), true);
    strictEqual(prompt.includes("### Option"), true);
  });

  it("builds a directed prompt with focus keywords", () => {
    const prompt = buildScoutProposePrompt("kubernetes");
    strictEqual(prompt.includes("kubernetes"), true);
    strictEqual(prompt.includes("Focus area:"), true);
    strictEqual(prompt.includes("Do NOT create"), true);
  });

  it("trims whitespace from direction", () => {
    const prompt = buildScoutProposePrompt("  docker  ");
    strictEqual(prompt.includes("Focus area: docker"), true);
  });
});

describe("buildScoutExecutePrompt", () => {
  it("builds an execution prompt with option details", () => {
    const prompt = buildScoutExecutePrompt("K8s Rollback", "Handle rollbacks");
    strictEqual(prompt.includes("K8s Rollback"), true);
    strictEqual(prompt.includes("Handle rollbacks"), true);
    strictEqual(prompt.includes("MUST be checkpointed"), true);
    strictEqual(prompt.includes("rank 1"), true);
  });

  it("includes user guidance when provided", () => {
    const prompt = buildScoutExecutePrompt("Test", "Desc", "Focus on edge cases");
    strictEqual(prompt.includes("Focus on edge cases"), true);
  });

  it("omits guidance section when empty", () => {
    const prompt = buildScoutExecutePrompt("Test", "Desc");
    strictEqual(prompt.includes("Additional user guidance"), false);
  });
});

import { strictEqual } from "node:assert";
import { describe, it } from "node:test";
import { buildCreateExecutePrompt, buildCreateProposePrompt } from "./trainer_create_prompt.ts";

describe("buildCreateProposePrompt", () => {
  it("builds a topicless prompt for friction mining", () => {
    const prompt = buildCreateProposePrompt();
    strictEqual(prompt.includes("Analyze the current skill library"), true);
    strictEqual(prompt.includes("frustrations"), true);
    strictEqual(prompt.includes("Do NOT create"), true);
    strictEqual(prompt.includes("### Option"), true);
  });

  it("builds a directed prompt with topic keywords", () => {
    const prompt = buildCreateProposePrompt("kubernetes");
    strictEqual(prompt.includes("kubernetes"), true);
    strictEqual(prompt.includes("Focus area:"), true);
    strictEqual(prompt.includes("Do NOT create"), true);
  });

  it("trims whitespace from topic", () => {
    const prompt = buildCreateProposePrompt("  docker  ");
    strictEqual(prompt.includes("Focus area: docker"), true);
  });
});

describe("buildCreateExecutePrompt", () => {
  it("builds an execution prompt with option details", () => {
    const prompt = buildCreateExecutePrompt("K8s Rollback", "Handle rollbacks");
    strictEqual(prompt.includes("K8s Rollback"), true);
    strictEqual(prompt.includes("Handle rollbacks"), true);
    strictEqual(prompt.includes("auto-checkpointed to rank 1"), true);
  });

  it("includes user guidance when provided", () => {
    const prompt = buildCreateExecutePrompt("Test", "Desc", "Focus on edge cases");
    strictEqual(prompt.includes("Focus on edge cases"), true);
  });

  it("omits guidance section when empty", () => {
    const prompt = buildCreateExecutePrompt("Test", "Desc");
    strictEqual(prompt.includes("Additional user guidance"), false);
  });
});

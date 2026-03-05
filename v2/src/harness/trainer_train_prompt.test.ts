import { strictEqual } from "node:assert";
import { describe, it } from "node:test";
import { buildTrainExecutePrompt, buildTrainProposePrompt } from "./trainer_train_prompt.ts";

describe("buildTrainProposePrompt", () => {
  it("includes skill name and content in the prompt", () => {
    const prompt = buildTrainProposePrompt("skill-mcp", "# MCP Integration\n...");
    strictEqual(prompt.includes("skill-mcp"), true);
    strictEqual(prompt.includes("# MCP Integration"), true);
    strictEqual(prompt.includes("Do NOT modify"), true);
    strictEqual(prompt.includes("### Option"), true);
  });

  it("uses skill name as recall query context", () => {
    const prompt = buildTrainProposePrompt("deploy", "# Deploy\nSteps...");
    strictEqual(prompt.includes("recall to search memories about: deploy"), true);
  });
});

describe("buildTrainExecutePrompt", () => {
  it("builds an execution prompt with improvement details", () => {
    const prompt = buildTrainExecutePrompt(
      "skill-mcp",
      "Add retry logic",
      "Transient errors cause silent failures",
    );
    strictEqual(prompt.includes("skill-mcp"), true);
    strictEqual(prompt.includes("Add retry logic"), true);
    strictEqual(prompt.includes("MUST be checkpointed"), true);
  });

  it("includes user guidance when provided", () => {
    const prompt = buildTrainExecutePrompt(
      "deploy",
      "Expand",
      "Details",
      "Also add rollback steps",
    );
    strictEqual(prompt.includes("Also add rollback steps"), true);
  });

  it("omits guidance section when not provided", () => {
    const prompt = buildTrainExecutePrompt("deploy", "Fix", "Desc");
    strictEqual(prompt.includes("Additional user guidance"), false);
  });
});

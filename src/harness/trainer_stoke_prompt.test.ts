import { strictEqual } from "node:assert";
import { describe, it } from "node:test";
import { buildStokePrompt } from "./trainer_stoke_prompt.ts";

describe("buildStokePrompt", () => {
  it("includes fragment summary and skill index", () => {
    const prompt = buildStokePrompt(
      "1. User prefers explicit types (domain: typescript)",
      "- skills/deploy/: Deploy to Vercel",
    );
    strictEqual(prompt.includes("Background exploration"), true);
    strictEqual(prompt.includes("User prefers explicit types"), true);
    strictEqual(prompt.includes("skills/deploy/"), true);
    strictEqual(prompt.includes("drop_fragment"), true);
    strictEqual(prompt.includes("recall"), true);
  });

  it("handles empty inputs gracefully", () => {
    const prompt = buildStokePrompt("", "");
    strictEqual(prompt.includes("(no skills yet)"), true);
    strictEqual(prompt.includes("(none)"), true);
  });

  it("includes constraint about not creating skills", () => {
    const prompt = buildStokePrompt("frag", "index");
    strictEqual(prompt.includes("Do NOT create"), true);
    strictEqual(prompt.includes("Do NOT edit"), true);
  });

  it("includes trail signals when provided", () => {
    const prompt = buildStokePrompt("frag", "index", "- [wisdom] Manual deploys");
    strictEqual(prompt.includes("Trail-derived friction signals"), true);
    strictEqual(prompt.includes("Manual deploys"), true);
  });

  it("omits trail section when signals are undefined", () => {
    const prompt = buildStokePrompt("frag", "index");
    strictEqual(prompt.includes("Trail-derived"), false);
  });
});

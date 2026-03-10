import { ok, strictEqual } from "node:assert";
import { describe, it } from "node:test";
import { buildAttunePrompt } from "./mentor_attune_prompt.ts";

describe("buildAttunePrompt", () => {
  it("includes soul name and evidence", () => {
    const prompt = buildAttunePrompt(
      "JS Engineer",
      "## Delegation Stats\n...\n## Pending Soulshards (3)\n...",
    );
    ok(prompt.includes('"JS Engineer"'));
    ok(prompt.includes("Delegation Stats"));
    ok(prompt.includes("Pending Soulshards"));
  });

  it("instructs shard_ids usage", () => {
    const prompt = buildAttunePrompt("Ghostpaw", "evidence");
    ok(prompt.includes("shard_ids"));
    ok(prompt.includes("propose_trait"));
    ok(prompt.includes("revise_trait"));
    ok(prompt.includes("revert_trait"));
  });

  it("returns a string", () => {
    const prompt = buildAttunePrompt("Mentor", "");
    strictEqual(typeof prompt, "string");
    ok(prompt.length > 100);
  });
});

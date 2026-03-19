import { ok, strictEqual } from "node:assert";
import { describe, it } from "node:test";
import {
  buildDescriptionPrompt,
  buildNamePrompt,
} from "../../../../harness/oneshots/generate_soul_text.ts";

describe("buildDescriptionPrompt", () => {
  it("includes soul name", () => {
    const prompt = buildDescriptionPrompt("Ghostpaw", "", []);
    ok(prompt.includes('"Ghostpaw"'));
  });

  it("includes truncated essence", () => {
    const prompt = buildDescriptionPrompt("Test", "My essence here.", []);
    ok(prompt.includes("My essence here."));
  });

  it("truncates long essence at 300 chars", () => {
    const longEssence = "x".repeat(500);
    const prompt = buildDescriptionPrompt("Test", longEssence, []);
    ok(prompt.includes("x".repeat(300)));
    strictEqual(prompt.includes("x".repeat(301)), false);
  });

  it("includes trait principles (up to 5)", () => {
    const traits = ["Trait A", "Trait B", "Trait C", "Trait D", "Trait E", "Trait F"];
    const prompt = buildDescriptionPrompt("Test", "e", traits);
    ok(prompt.includes("Trait A"));
    ok(prompt.includes("Trait E"));
    strictEqual(prompt.includes("Trait F"), false);
    ok(prompt.includes("6 active traits"));
  });

  it("omits essence clause when empty", () => {
    const prompt = buildDescriptionPrompt("Test", "", []);
    strictEqual(prompt.includes("with essence:"), false);
  });

  it("omits traits clause when empty", () => {
    const prompt = buildDescriptionPrompt("Test", "e", []);
    strictEqual(prompt.includes("active traits"), false);
  });
});

describe("buildNamePrompt", () => {
  it("includes soul name", () => {
    const prompt = buildNamePrompt("Ghostpaw", "", "");
    ok(prompt.includes('"Ghostpaw"'));
  });

  it("includes description when provided", () => {
    const prompt = buildNamePrompt("Test", "A helpful soul.", "");
    ok(prompt.includes("A helpful soul."));
  });

  it("includes truncated essence", () => {
    const prompt = buildNamePrompt("Test", "", "Some essence.");
    ok(prompt.includes("Some essence."));
  });

  it("truncates long essence at 200 chars", () => {
    const longEssence = "y".repeat(300);
    const prompt = buildNamePrompt("Test", "", longEssence);
    ok(prompt.includes("y".repeat(200)));
    strictEqual(prompt.includes("y".repeat(201)), false);
  });

  it("omits description clause when empty", () => {
    const prompt = buildNamePrompt("Test", "", "e");
    strictEqual(prompt.includes("with description:"), false);
  });

  it("omits essence clause when empty", () => {
    const prompt = buildNamePrompt("Test", "d", "");
    strictEqual(prompt.includes("essence excerpt:"), false);
  });
});

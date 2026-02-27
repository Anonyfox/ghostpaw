import { ok, strictEqual } from "node:assert/strict";
import { describe, it } from "node:test";
import type { CleanResult, KnownKey } from "./types.ts";

describe("KnownKey", () => {
  it("accepts all required fields", () => {
    const key: KnownKey = {
      canonical: "OPENAI_API_KEY",
      aliases: ["OPENAI_KEY"],
      label: "OpenAI",
      category: "llm",
    };
    strictEqual(key.canonical, "OPENAI_API_KEY");
    strictEqual(key.category, "llm");
    ok(key.aliases.length > 0);
  });

  it("category is a narrow union of llm or search", () => {
    const categories: KnownKey["category"][] = ["llm", "search"];
    strictEqual(categories.length, 2);
  });
});

describe("CleanResult", () => {
  it("accepts value without warning", () => {
    const result: CleanResult = { value: "sk-abc123" };
    strictEqual(result.value, "sk-abc123");
    strictEqual(result.warning, undefined);
  });

  it("accepts value with warning", () => {
    const result: CleanResult = {
      value: "sk-abc123",
      warning: "Key prefix does not match expected pattern.",
    };
    ok(result.warning !== undefined);
  });
});

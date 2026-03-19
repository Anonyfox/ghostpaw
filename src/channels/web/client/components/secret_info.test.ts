import { ok, strictEqual } from "node:assert/strict";
import { describe, it } from "node:test";
import type { SecretInfo } from "./secret_info.ts";

describe("SecretInfo", () => {
  it("accepts all required fields", () => {
    const info: SecretInfo = {
      key: "API_KEY_OPENAI",
      label: "OpenAI",
      category: "llm",
      configured: true,
      isActiveSearch: false,
    };
    strictEqual(info.key, "API_KEY_OPENAI");
    strictEqual(info.configured, true);
    ok(["llm", "search", "custom"].includes(info.category));
  });
});

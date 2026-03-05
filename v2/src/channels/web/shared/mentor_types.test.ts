import { ok, strictEqual } from "node:assert";
import { describe, it } from "node:test";
import type { MentorActionResponse } from "./mentor_types.ts";

describe("mentor shared types", () => {
  it("MentorActionResponse is structurally valid", () => {
    const response: MentorActionResponse = {
      content: "The soul is performing well.",
      succeeded: true,
      cost: { totalUsd: 0.03 },
    };
    ok(response.content.length > 0);
    strictEqual(response.succeeded, true);
    ok(response.cost.totalUsd >= 0);
  });

  it("MentorActionResponse represents a failed response", () => {
    const response: MentorActionResponse = {
      content: "An error occurred during review.",
      succeeded: false,
      cost: { totalUsd: 0.01 },
    };
    strictEqual(response.succeeded, false);
  });
});

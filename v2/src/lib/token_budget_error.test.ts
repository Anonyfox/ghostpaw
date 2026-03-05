import { ok, strictEqual, throws } from "node:assert/strict";
import { describe, it } from "node:test";
import { TokenBudgetError } from "./token_budget_error.ts";

describe("TokenBudgetError", () => {
  it("reports session scope with actionable message", () => {
    const err = new TokenBudgetError("session", 200_000, 200_000);
    strictEqual(err.scope, "session");
    strictEqual(err.used, 200_000);
    strictEqual(err.limit, 200_000);
    ok(err.message.includes("Session token limit"));
    ok(err.message.includes("200,000"));
    ok(err.message.includes("max_tokens_per_session"));
  });

  it("reports day scope with actionable message", () => {
    const err = new TokenBudgetError("day", 1_000_000, 1_000_000);
    strictEqual(err.scope, "day");
    ok(err.message.includes("Daily token limit"));
    ok(err.message.includes("max_tokens_per_day"));
  });

  it("is throwable and catchable by name", () => {
    throws(
      () => {
        throw new TokenBudgetError("session", 100, 100);
      },
      { name: "TokenBudgetError" },
    );
  });

  it("is an instance of Error", () => {
    const err = new TokenBudgetError("day", 50_000, 50_000);
    ok(err instanceof Error);
    ok(err instanceof TokenBudgetError);
  });

  it("formats large numbers with locale separators", () => {
    const err = new TokenBudgetError("session", 1_234_567, 2_000_000);
    ok(err.message.includes("1,234,567"));
    ok(err.message.includes("2,000,000"));
  });
});

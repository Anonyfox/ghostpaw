import { ok, strictEqual, throws } from "node:assert/strict";
import { describe, it } from "node:test";
import { SpendLimitError } from "./spend_limit_error.ts";

describe("SpendLimitError", () => {
  it("includes spent and limit in the message", () => {
    const err = new SpendLimitError(5.1234, 5.0);
    ok(err.message.includes("$5.1234"));
    ok(err.message.includes("$5.00"));
    ok(err.message.includes("Daily spend limit reached"));
  });

  it("exposes spent and limit as properties", () => {
    const err = new SpendLimitError(3.5, 5.0);
    strictEqual(err.spent, 3.5);
    strictEqual(err.limit, 5.0);
  });

  it("has name SpendLimitError", () => {
    const err = new SpendLimitError(0, 0);
    strictEqual(err.name, "SpendLimitError");
  });

  it("is an instance of Error", () => {
    const err = new SpendLimitError(1, 2);
    ok(err instanceof Error);
    ok(err instanceof SpendLimitError);
  });

  it("includes actionable hint in message", () => {
    const err = new SpendLimitError(1, 2);
    ok(err.message.includes("Settings > Costs"));
  });

  it("can be thrown and caught", () => {
    throws(
      () => {
        throw new SpendLimitError(10, 5);
      },
      (err: unknown) => err instanceof SpendLimitError && err.spent === 10 && err.limit === 5,
    );
  });
});

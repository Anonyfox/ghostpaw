import assert from "node:assert";
import { describe, it } from "node:test";
import { readSecret } from "./read_secret.ts";

describe("lib/read_secret", () => {
  it("exports readSecret function", () => {
    assert.strictEqual(typeof readSecret, "function");
  });
});

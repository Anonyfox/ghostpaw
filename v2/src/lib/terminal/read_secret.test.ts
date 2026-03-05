import { ok, strictEqual } from "node:assert";
import { describe, it } from "node:test";
import { readSecret } from "./read_secret.ts";

describe("readSecret", () => {
  it("exports a function", () => {
    strictEqual(typeof readSecret, "function");
  });

  it("accepts a prompt string argument", () => {
    strictEqual(readSecret.length, 1);
  });

  it("returns a promise", () => {
    if (!process.stdin.isTTY) return;
    const result = readSecret("test: ");
    ok(result instanceof Promise);
    // immediately cancel by destroying stdin would be complex; just type-check
    ok(typeof result.then === "function");
  });

  it("rejects when stdin is not a TTY", async () => {
    if (process.stdin.isTTY) return;
    try {
      await readSecret("test: ");
      ok(false, "should have rejected");
    } catch (err) {
      ok(err instanceof Error);
      ok(err.message.includes("TTY"));
    }
  });
});

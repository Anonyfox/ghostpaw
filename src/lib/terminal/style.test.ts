import { ok, strictEqual } from "node:assert";
import { describe, it } from "node:test";
import { style } from "./style.ts";

describe("style", () => {
  it("bold wraps text and returns a string containing the original text", () => {
    const result = style.bold("hello");
    ok(result.includes("hello"));
    ok(typeof result === "string");
  });

  it("dim wraps text and returns a string containing the original text", () => {
    const result = style.dim("faded");
    ok(result.includes("faded"));
  });

  it("all color functions return strings containing the original text", () => {
    const fns = [
      style.red,
      style.green,
      style.yellow,
      style.cyan,
      style.boldCyan,
      style.boldGreen,
      style.boldRed,
      style.boldYellow,
    ];
    for (const fn of fns) {
      const result = fn("test");
      ok(result.includes("test"), `${fn.name ?? "style fn"} should contain original text`);
    }
  });

  it("handles empty strings", () => {
    strictEqual(typeof style.bold(""), "string");
    strictEqual(typeof style.dim(""), "string");
  });

  it("handles strings with special characters", () => {
    const result = style.bold("hello\nworld");
    ok(result.includes("hello\nworld"));
  });
});

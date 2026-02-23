import { ok, strictEqual } from "node:assert";
import { describe, it } from "node:test";
import { style, label, banner } from "./terminal.js";

describe("style helpers", () => {
  it("bold wraps text and returns a string", () => {
    const result = style.bold("hello");
    ok(typeof result === "string");
    ok(result.includes("hello"));
  });

  it("dim wraps text and returns a string", () => {
    const result = style.dim("muted");
    ok(typeof result === "string");
    ok(result.includes("muted"));
  });

  it("all color functions return strings containing the input", () => {
    const fns = [
      style.red,
      style.green,
      style.yellow,
      style.cyan,
      style.boldCyan,
      style.boldGreen,
      style.boldRed,
      style.boldYellow,
      style.italic,
    ];
    for (const fn of fns) {
      const result = fn("test");
      ok(typeof result === "string");
      ok(result.includes("test"), `${fn.name} should include input text`);
    }
  });

  it("style functions are idempotent on the text content", () => {
    strictEqual(style.bold("x").includes("x"), true);
    strictEqual(style.dim("y").includes("y"), true);
  });
});

describe("label", () => {
  it("does not throw", () => {
    label("test", "message");
    label("info", "something", style.boldCyan);
  });
});

describe("banner", () => {
  it("does not throw", () => {
    banner("ghostpaw", "0.1.0");
  });
});

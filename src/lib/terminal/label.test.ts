import { ok, strictEqual } from "node:assert";
import { describe, it } from "node:test";
import { label } from "./label.ts";

describe("label", () => {
  it("produces output containing the tag and message", () => {
    const lines: string[] = [];
    const origLog = console.log;
    console.log = (...args: unknown[]) => lines.push(args.join(" "));
    try {
      label("done", "it works");
    } finally {
      console.log = origLog;
    }
    strictEqual(lines.length, 1);
    ok(lines[0]!.includes("done"));
    ok(lines[0]!.includes("it works"));
  });

  it("right-pads tag within a 10-char field", () => {
    const lines: string[] = [];
    const origLog = console.log;
    console.log = (...args: unknown[]) => lines.push(args.join(" "));
    try {
      label("ok", "msg");
    } finally {
      console.log = origLog;
    }
    ok(lines[0]!.includes("ok"));
  });

  it("accepts a custom color function", () => {
    const lines: string[] = [];
    const origLog = console.log;
    console.log = (...args: unknown[]) => lines.push(args.join(" "));
    try {
      label("test", "custom", (s) => `[${s}]`);
    } finally {
      console.log = origLog;
    }
    ok(lines[0]!.includes("["));
    ok(lines[0]!.includes("custom"));
  });
});

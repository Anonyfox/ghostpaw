import { strictEqual } from "node:assert";
import { describe, it } from "node:test";
import { blank } from "./blank.ts";

describe("blank", () => {
  it("prints an empty line", () => {
    const lines: string[] = [];
    const origLog = console.log;
    console.log = (...args: unknown[]) => lines.push(args.join(" "));
    try {
      blank();
    } finally {
      console.log = origLog;
    }
    strictEqual(lines.length, 1);
    strictEqual(lines[0], "");
  });
});

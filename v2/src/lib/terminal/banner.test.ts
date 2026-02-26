import { ok } from "node:assert";
import { describe, it } from "node:test";
import { banner } from "./banner.ts";

describe("banner", () => {
  it("prints name and version", () => {
    const lines: string[] = [];
    const origLog = console.log;
    console.log = (...args: unknown[]) => lines.push(args.join(" "));
    try {
      banner("ghostpaw", "1.0.0");
    } finally {
      console.log = origLog;
    }
    ok(lines[0]!.includes("ghostpaw"));
    ok(lines[0]!.includes("1.0.0"));
  });
});

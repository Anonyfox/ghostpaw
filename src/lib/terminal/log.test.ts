import { ok } from "node:assert";
import { describe, it } from "node:test";
import { log } from "./log.ts";

describe("log", () => {
  it("log.done produces output containing the tag and message", () => {
    const lines: string[] = [];
    const origLog = console.log;
    console.log = (...args: unknown[]) => lines.push(args.join(" "));
    try {
      log.done("completed");
    } finally {
      console.log = origLog;
    }
    ok(lines[0]!.includes("completed"));
    ok(lines[0]!.includes("done"));
  });

  it("log.error produces output containing the tag and message", () => {
    const lines: string[] = [];
    const origLog = console.log;
    console.log = (...args: unknown[]) => lines.push(args.join(" "));
    try {
      log.error("broken");
    } finally {
      console.log = origLog;
    }
    ok(lines[0]!.includes("broken"));
    ok(lines[0]!.includes("error"));
  });

  it("log.warn produces output containing the tag and message", () => {
    const lines: string[] = [];
    const origLog = console.log;
    console.log = (...args: unknown[]) => lines.push(args.join(" "));
    try {
      log.warn("careful");
    } finally {
      console.log = origLog;
    }
    ok(lines[0]!.includes("careful"));
    ok(lines[0]!.includes("warning"));
  });

  it("all log methods produce output without throwing", () => {
    const origLog = console.log;
    console.log = () => {};
    try {
      log.created("file.ts");
      log.exists("file.ts");
      log.done("all good");
      log.info("note");
      log.warn("heads up");
      log.error("nope");
      log.step("step one");
    } finally {
      console.log = origLog;
    }
  });
});

import { ok, strictEqual } from "node:assert";
import { describe, it } from "node:test";
import cmd from "./memory_merge.ts";

describe("memory merge", () => {
  it("has correct meta", () => {
    const meta = cmd.meta as { name?: string; description?: string } | undefined;
    strictEqual(meta?.name, "merge");
    ok(meta?.description);
  });

  it("requires ids flag", () => {
    const args = cmd.args as Record<string, { type: string; required?: boolean }>;
    strictEqual(args.ids?.type, "string");
    strictEqual(args.ids?.required, true);
  });

  it("requires claim flag", () => {
    const args = cmd.args as Record<string, { type: string; required?: boolean }>;
    strictEqual(args.claim?.type, "string");
    strictEqual(args.claim?.required, true);
  });

  it("has a run function", () => {
    ok(typeof cmd.run === "function");
  });
});

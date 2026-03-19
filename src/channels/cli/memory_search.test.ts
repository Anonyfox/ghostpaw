import { ok, strictEqual } from "node:assert";
import { describe, it } from "node:test";
import cmd from "./memory_search.ts";

describe("memory search", () => {
  it("has correct meta", () => {
    const meta = cmd.meta as { name?: string; description?: string } | undefined;
    strictEqual(meta?.name, "search");
    ok(meta?.description);
  });

  it("requires query positional", () => {
    const args = cmd.args as Record<string, { type: string; required?: boolean }>;
    strictEqual(args.query?.type, "positional");
    strictEqual(args.query?.required, true);
  });

  it("has optional category flag", () => {
    const args = cmd.args as Record<string, { type: string }>;
    strictEqual(args.category?.type, "string");
  });

  it("has a run function", () => {
    ok(typeof cmd.run === "function");
  });
});

import { ok, strictEqual } from "node:assert";
import { describe, it } from "node:test";
import cmd from "./memory_add.ts";

describe("memory add", () => {
  it("has correct meta", () => {
    const meta = cmd.meta as { name?: string; description?: string } | undefined;
    strictEqual(meta?.name, "add");
    ok(meta?.description);
  });

  it("requires claim positional", () => {
    const args = cmd.args as Record<string, { type: string; required?: boolean }>;
    strictEqual(args.claim?.type, "positional");
    strictEqual(args.claim?.required, true);
  });

  it("has optional source flag", () => {
    const args = cmd.args as Record<string, { type: string }>;
    strictEqual(args.source?.type, "string");
  });

  it("has optional category flag", () => {
    const args = cmd.args as Record<string, { type: string }>;
    strictEqual(args.category?.type, "string");
  });

  it("has a run function", () => {
    ok(typeof cmd.run === "function");
  });
});

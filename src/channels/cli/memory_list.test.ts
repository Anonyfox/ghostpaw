import { ok, strictEqual } from "node:assert";
import { describe, it } from "node:test";
import cmd from "./memory_list.ts";

describe("memory list", () => {
  it("has correct meta", () => {
    const meta = cmd.meta as { name?: string; description?: string } | undefined;
    strictEqual(meta?.name, "list");
    ok(meta?.description);
  });

  it("has optional category flag", () => {
    const args = cmd.args as Record<string, { type: string }>;
    strictEqual(args.category?.type, "string");
  });

  it("has optional strength flag", () => {
    const args = cmd.args as Record<string, { type: string }>;
    strictEqual(args.strength?.type, "string");
  });

  it("has optional stale flag", () => {
    const args = cmd.args as Record<string, { type: string }>;
    strictEqual(args.stale?.type, "boolean");
  });

  it("has a run function", () => {
    ok(typeof cmd.run === "function");
  });
});

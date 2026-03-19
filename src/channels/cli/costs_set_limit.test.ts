import { ok, strictEqual } from "node:assert";
import { describe, it } from "node:test";
import cmd from "./costs_set_limit.ts";

describe("costs set-limit", () => {
  it("has correct meta", () => {
    const meta = cmd.meta as { name?: string; description?: string } | undefined;
    strictEqual(meta?.name, "set-limit");
    ok(meta?.description);
  });

  it("requires amount positional", () => {
    const args = cmd.args as Record<string, { type: string; required?: boolean }>;
    strictEqual(args.amount?.type, "positional");
    strictEqual(args.amount?.required, true);
  });

  it("has a run function", () => {
    ok(typeof cmd.run === "function");
  });
});

import { ok, strictEqual } from "node:assert";
import { describe, it } from "node:test";
import cmd from "./scout.ts";

describe("scout", () => {
  it("has correct meta", () => {
    const meta = cmd.meta as { name?: string; description?: string } | undefined;
    strictEqual(meta?.name, "scout");
    ok(meta?.description);
  });

  it("accepts optional positional direction arg", () => {
    const args = cmd.args as Record<string, { type: string; required?: boolean }> | undefined;
    ok(args?.direction);
    strictEqual(args?.direction.type, "positional");
    strictEqual(args?.direction.required, false);
  });

  it("has a run function", () => {
    ok(typeof cmd.run === "function");
  });
});

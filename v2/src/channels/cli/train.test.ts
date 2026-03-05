import { ok, strictEqual } from "node:assert";
import { describe, it } from "node:test";
import cmd from "./train.ts";

describe("train", () => {
  it("has correct meta", () => {
    const meta = cmd.meta as { name?: string; description?: string } | undefined;
    strictEqual(meta?.name, "train");
    ok(meta?.description);
  });

  it("accepts optional positional skill arg", () => {
    const args = cmd.args as Record<string, { type: string; required?: boolean }> | undefined;
    ok(args?.skill);
    strictEqual(args?.skill.type, "positional");
    strictEqual(args?.skill.required, false);
  });

  it("accepts optional model arg", () => {
    const args = cmd.args as Record<string, { type: string; required?: boolean }> | undefined;
    ok(args?.model);
    strictEqual(args?.model.type, "string");
    strictEqual(args?.model.required, false);
  });

  it("has a run function", () => {
    ok(typeof cmd.run === "function");
  });
});

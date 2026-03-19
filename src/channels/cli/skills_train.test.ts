import { ok, strictEqual } from "node:assert";
import { describe, it } from "node:test";
import cmd from "./skills_train.ts";

describe("skills train", () => {
  it("has correct meta", () => {
    const meta = cmd.meta as { name?: string; description?: string } | undefined;
    strictEqual(meta?.name, "train");
    ok(meta?.description);
  });

  it("has a run function", () => {
    ok(typeof cmd.run === "function");
  });

  it("accepts optional skill positional arg and model flag", () => {
    const args = cmd.args as Record<string, { type: string }>;
    ok(args.skill);
    ok(args.model);
  });
});

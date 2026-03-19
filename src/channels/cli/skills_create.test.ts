import { ok, strictEqual } from "node:assert";
import { describe, it } from "node:test";
import cmd from "./skills_create.ts";

describe("skills create", () => {
  it("has correct meta", () => {
    const meta = cmd.meta as { name?: string; description?: string } | undefined;
    strictEqual(meta?.name, "create");
    ok(meta?.description);
  });

  it("has a run function", () => {
    ok(typeof cmd.run === "function");
  });

  it("accepts optional topic positional arg and model flag", () => {
    const args = cmd.args as Record<string, { type: string }>;
    ok(args.topic);
    ok(args.model);
  });
});

import { ok, strictEqual } from "node:assert";
import { describe, it } from "node:test";
import cmd from "./skills_repair.ts";

describe("skills repair", () => {
  it("has correct meta", () => {
    const meta = cmd.meta as { name?: string; description?: string } | undefined;
    strictEqual(meta?.name, "repair");
    ok(meta?.description);
  });

  it("has a positional name argument", () => {
    const args = cmd.args as Record<string, { type: string }>;
    strictEqual(args.name?.type, "positional");
  });

  it("has a flat flag", () => {
    const args = cmd.args as Record<string, { type: string }>;
    strictEqual(args.flat?.type, "boolean");
  });

  it("has a run function", () => {
    ok(typeof cmd.run === "function");
  });
});

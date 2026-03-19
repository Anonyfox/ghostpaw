import { ok, strictEqual } from "node:assert";
import { describe, it } from "node:test";
import cmd from "./skills_checkpoint.ts";

describe("skills checkpoint", () => {
  it("has correct meta", () => {
    const meta = cmd.meta as { name?: string; description?: string } | undefined;
    strictEqual(meta?.name, "checkpoint");
    ok(meta?.description);
  });

  it("has a positional skills argument", () => {
    const args = cmd.args as Record<string, { type: string }>;
    strictEqual(args.skills?.type, "positional");
  });

  it("has a message flag", () => {
    const args = cmd.args as Record<string, { type: string }>;
    strictEqual(args.message?.type, "string");
  });

  it("has a run function", () => {
    ok(typeof cmd.run === "function");
  });
});

import { ok, strictEqual } from "node:assert";
import { describe, it } from "node:test";
import cmd from "./skills_show.ts";

describe("skills show", () => {
  it("has correct meta", () => {
    const meta = cmd.meta as { name?: string; description?: string } | undefined;
    strictEqual(meta?.name, "show");
    ok(meta?.description);
  });

  it("has a positional name argument", () => {
    const args = cmd.args as Record<string, { type: string }>;
    strictEqual(args.name?.type, "positional");
  });

  it("has a run function", () => {
    ok(typeof cmd.run === "function");
  });
});

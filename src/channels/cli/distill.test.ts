import { ok, strictEqual } from "node:assert";
import { describe, it } from "node:test";
import cmd from "./distill.ts";

describe("distill CLI command", () => {
  it("has correct meta", () => {
    const meta = cmd.meta as { name?: string; description?: string } | undefined;
    strictEqual(meta?.name, "distill");
    ok(meta?.description);
  });

  it("has optional session flag", () => {
    const args = cmd.args as Record<string, { type: string }>;
    strictEqual(args.session?.type, "string");
  });

  it("has optional model flag", () => {
    const args = cmd.args as Record<string, { type: string }>;
    strictEqual(args.model?.type, "string");
  });

  it("has optional limit flag", () => {
    const args = cmd.args as Record<string, { type: string }>;
    strictEqual(args.limit?.type, "string");
  });

  it("has a run function", () => {
    ok(typeof cmd.run === "function");
  });
});

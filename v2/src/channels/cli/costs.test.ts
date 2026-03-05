import { ok, strictEqual } from "node:assert";
import { describe, it } from "node:test";
import cmd from "./costs.ts";

describe("costs", () => {
  it("has correct meta", () => {
    const meta = cmd.meta as { name?: string; description?: string } | undefined;
    strictEqual(meta?.name, "costs");
    ok(meta?.description);
  });

  it("has optional days flag", () => {
    const args = cmd.args as Record<string, { type: string }>;
    strictEqual(args.days?.type, "string");
  });

  it("has set-limit subcommand", () => {
    ok(cmd.subCommands);
    ok("set-limit" in (cmd.subCommands as Record<string, unknown>));
  });

  it("has a run function", () => {
    ok(typeof cmd.run === "function");
  });
});

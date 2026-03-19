import { ok, strictEqual } from "node:assert";
import { describe, it } from "node:test";
import cmd from "./souls_edit.ts";

describe("souls edit", () => {
  it("has correct meta", () => {
    const meta = cmd.meta as { name?: string; description?: string } | undefined;
    strictEqual(meta?.name, "edit");
    ok(meta?.description);
  });

  it("requires soul positional", () => {
    const args = cmd.args as Record<string, { type: string; required?: boolean }>;
    strictEqual(args.soul?.type, "positional");
    strictEqual(args.soul?.required, true);
  });

  it("has optional name, essence, description flags", () => {
    const args = cmd.args as Record<string, { type: string }>;
    strictEqual(args.name?.type, "string");
    strictEqual(args.essence?.type, "string");
    strictEqual(args.description?.type, "string");
  });

  it("has a run function", () => {
    ok(typeof cmd.run === "function");
  });
});

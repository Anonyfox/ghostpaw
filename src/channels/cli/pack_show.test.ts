import { ok, strictEqual } from "node:assert";
import { describe, it } from "node:test";
import cmd from "./pack_show.ts";

describe("pack show", () => {
  it("has correct meta", () => {
    const meta = cmd.meta as { name?: string; description?: string } | undefined;
    strictEqual(meta?.name, "show");
    ok(meta?.description);
  });

  it("requires member positional", () => {
    const args = cmd.args as Record<string, { type: string; required?: boolean }>;
    strictEqual(args.member?.type, "positional");
    strictEqual(args.member?.required, true);
  });

  it("has a run function", () => {
    ok(typeof cmd.run === "function");
  });
});

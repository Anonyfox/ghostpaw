import { ok, strictEqual } from "node:assert";
import { describe, it } from "node:test";
import cmd from "./souls_revert_trait.ts";

describe("souls revert-trait", () => {
  it("has correct meta", () => {
    const meta = cmd.meta as { name?: string; description?: string } | undefined;
    strictEqual(meta?.name, "revert-trait");
    ok(meta?.description);
  });

  it("requires traitId positional", () => {
    const args = cmd.args as Record<string, { type: string; required?: boolean }>;
    strictEqual(args.traitId?.type, "positional");
    strictEqual(args.traitId?.required, true);
  });

  it("has a run function", () => {
    ok(typeof cmd.run === "function");
  });
});

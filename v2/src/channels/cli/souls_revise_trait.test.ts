import { ok, strictEqual } from "node:assert";
import { describe, it } from "node:test";
import cmd from "./souls_revise_trait.ts";

describe("souls revise-trait", () => {
  it("has correct meta", () => {
    const meta = cmd.meta as { name?: string; description?: string } | undefined;
    strictEqual(meta?.name, "revise-trait");
    ok(meta?.description);
  });

  it("requires traitId positional", () => {
    const args = cmd.args as Record<string, { type: string; required?: boolean }>;
    strictEqual(args.traitId?.type, "positional");
    strictEqual(args.traitId?.required, true);
  });

  it("has optional --principle and --provenance flags", () => {
    const args = cmd.args as Record<string, { type: string }>;
    strictEqual(args.principle?.type, "string");
    strictEqual(args.provenance?.type, "string");
  });

  it("has a run function", () => {
    ok(typeof cmd.run === "function");
  });
});

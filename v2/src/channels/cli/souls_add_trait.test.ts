import { ok, strictEqual } from "node:assert";
import { describe, it } from "node:test";
import cmd from "./souls_add_trait.ts";

describe("souls add-trait", () => {
  it("has correct meta", () => {
    const meta = cmd.meta as { name?: string; description?: string } | undefined;
    strictEqual(meta?.name, "add-trait");
    ok(meta?.description);
  });

  it("requires name positional", () => {
    const args = cmd.args as Record<string, { type: string; required?: boolean }>;
    strictEqual(args.name?.type, "positional");
    strictEqual(args.name?.required, true);
  });

  it("requires principle positional", () => {
    const args = cmd.args as Record<string, { type: string; required?: boolean }>;
    strictEqual(args.principle?.type, "positional");
    strictEqual(args.principle?.required, true);
  });

  it("has optional --provenance flag", () => {
    const args = cmd.args as Record<string, { type: string }>;
    strictEqual(args.provenance?.type, "string");
  });

  it("has a run function", () => {
    ok(typeof cmd.run === "function");
  });
});

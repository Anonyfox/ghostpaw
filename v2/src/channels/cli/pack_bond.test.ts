import { ok, strictEqual } from "node:assert";
import { describe, it } from "node:test";
import cmd from "./pack_bond.ts";

describe("pack bond", () => {
  it("has correct meta", () => {
    const meta = cmd.meta as { name?: string; description?: string } | undefined;
    strictEqual(meta?.name, "bond");
    ok(meta?.description);
  });

  it("requires member positional", () => {
    const args = cmd.args as Record<string, { type: string; required?: boolean }>;
    strictEqual(args.member?.type, "positional");
    strictEqual(args.member?.required, true);
  });

  it("has optional bond flag", () => {
    const args = cmd.args as Record<string, { type: string }>;
    strictEqual(args.bond?.type, "string");
  });

  it("has optional trust flag", () => {
    const args = cmd.args as Record<string, { type: string }>;
    strictEqual(args.trust?.type, "string");
  });

  it("has optional status flag", () => {
    const args = cmd.args as Record<string, { type: string }>;
    strictEqual(args.status?.type, "string");
  });

  it("has optional name flag", () => {
    const args = cmd.args as Record<string, { type: string }>;
    strictEqual(args.name?.type, "string");
  });

  it("has optional is-user flag", () => {
    const args = cmd.args as Record<string, { type: string }>;
    strictEqual(args["is-user"]?.type, "boolean");
  });

  it("has a run function", () => {
    ok(typeof cmd.run === "function");
  });
});

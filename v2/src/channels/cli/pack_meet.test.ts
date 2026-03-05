import { ok, strictEqual } from "node:assert";
import { describe, it } from "node:test";
import cmd from "./pack_meet.ts";

describe("pack meet", () => {
  it("has correct meta", () => {
    const meta = cmd.meta as { name?: string; description?: string } | undefined;
    strictEqual(meta?.name, "meet");
    ok(meta?.description);
  });

  it("requires name positional", () => {
    const args = cmd.args as Record<string, { type: string; required?: boolean }>;
    strictEqual(args.name?.type, "positional");
    strictEqual(args.name?.required, true);
  });

  it("has optional kind flag", () => {
    const args = cmd.args as Record<string, { type: string }>;
    strictEqual(args.kind?.type, "string");
  });

  it("has optional bond flag", () => {
    const args = cmd.args as Record<string, { type: string }>;
    strictEqual(args.bond?.type, "string");
  });

  it("has optional metadata flag", () => {
    const args = cmd.args as Record<string, { type: string }>;
    strictEqual(args.metadata?.type, "string");
  });

  it("has a run function", () => {
    ok(typeof cmd.run === "function");
  });
});

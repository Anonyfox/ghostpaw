import { ok, strictEqual } from "node:assert";
import { describe, it } from "node:test";
import cmd from "./pack_note.ts";

describe("pack note", () => {
  it("has correct meta", () => {
    const meta = cmd.meta as { name?: string; description?: string } | undefined;
    strictEqual(meta?.name, "note");
    ok(meta?.description);
  });

  it("requires member positional", () => {
    const args = cmd.args as Record<string, { type: string; required?: boolean }>;
    strictEqual(args.member?.type, "positional");
    strictEqual(args.member?.required, true);
  });

  it("requires summary positional", () => {
    const args = cmd.args as Record<string, { type: string; required?: boolean }>;
    strictEqual(args.summary?.type, "positional");
    strictEqual(args.summary?.required, true);
  });

  it("has optional kind flag", () => {
    const args = cmd.args as Record<string, { type: string }>;
    strictEqual(args.kind?.type, "string");
  });

  it("has optional significance flag", () => {
    const args = cmd.args as Record<string, { type: string }>;
    strictEqual(args.significance?.type, "string");
  });

  it("has a run function", () => {
    ok(typeof cmd.run === "function");
  });
});

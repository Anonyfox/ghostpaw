import { ok, strictEqual } from "node:assert";
import { describe, it } from "node:test";
import cmd from "./sessions_show.ts";

describe("sessions show", () => {
  it("has correct meta", () => {
    const meta = cmd.meta as { name?: string; description?: string } | undefined;
    strictEqual(meta?.name, "show");
    ok(meta?.description);
  });

  it("requires id positional", () => {
    const args = cmd.args as Record<string, { type: string; required?: boolean }>;
    strictEqual(args.id?.type, "positional");
    strictEqual(args.id?.required, true);
  });

  it("has optional transcript flag", () => {
    const args = cmd.args as Record<string, { type: string }>;
    strictEqual(args.transcript?.type, "boolean");
  });

  it("has a run function", () => {
    ok(typeof cmd.run === "function");
  });
});

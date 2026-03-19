import { ok, strictEqual } from "node:assert";
import { describe, it } from "node:test";
import cmd from "./pack_history.ts";

describe("pack history", () => {
  it("has correct meta", () => {
    const meta = cmd.meta as { name?: string; description?: string } | undefined;
    strictEqual(meta?.name, "history");
    ok(meta?.description);
  });

  it("requires member positional", () => {
    const args = cmd.args as Record<string, { type: string; required?: boolean }>;
    strictEqual(args.member?.type, "positional");
    strictEqual(args.member?.required, true);
  });

  it("has optional kind flag", () => {
    const args = cmd.args as Record<string, { type: string }>;
    strictEqual(args.kind?.type, "string");
  });

  it("has optional limit flag", () => {
    const args = cmd.args as Record<string, { type: string }>;
    strictEqual(args.limit?.type, "string");
  });

  it("has a run function", () => {
    ok(typeof cmd.run === "function");
  });
});

import { ok, strictEqual } from "node:assert";
import { describe, it } from "node:test";
import cmd from "./souls_awaken.ts";

describe("souls awaken", () => {
  it("has correct meta", () => {
    const meta = cmd.meta as { name?: string; description?: string } | undefined;
    strictEqual(meta?.name, "awaken");
    ok(meta?.description);
  });

  it("requires name positional", () => {
    const args = cmd.args as Record<string, { type: string; required?: boolean }>;
    strictEqual(args.name?.type, "positional");
    strictEqual(args.name?.required, true);
  });

  it("has optional --as flag", () => {
    const args = cmd.args as Record<string, { type: string }>;
    strictEqual(args.as?.type, "string");
  });

  it("has a run function", () => {
    ok(typeof cmd.run === "function");
  });
});

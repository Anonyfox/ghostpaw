import { ok, strictEqual } from "node:assert";
import { describe, it } from "node:test";
import cmd from "./souls_create.ts";

describe("souls create", () => {
  it("has correct meta", () => {
    const meta = cmd.meta as { name?: string; description?: string } | undefined;
    strictEqual(meta?.name, "create");
    ok(meta?.description);
  });

  it("requires name positional", () => {
    const args = cmd.args as Record<string, { type: string; required?: boolean }>;
    strictEqual(args.name?.type, "positional");
    strictEqual(args.name?.required, true);
  });

  it("requires essence flag", () => {
    const args = cmd.args as Record<string, { type: string; required?: boolean }>;
    strictEqual(args.essence?.type, "string");
    strictEqual(args.essence?.required, true);
  });

  it("has optional description flag", () => {
    const args = cmd.args as Record<string, { type: string }>;
    strictEqual(args.description?.type, "string");
  });

  it("has a run function", () => {
    ok(typeof cmd.run === "function");
  });
});

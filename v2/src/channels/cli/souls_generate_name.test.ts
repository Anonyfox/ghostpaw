import { ok, strictEqual } from "node:assert";
import { describe, it } from "node:test";
import cmd from "./souls_generate_name.ts";

describe("souls generate-name", () => {
  it("has correct meta", () => {
    const meta = cmd.meta as { name?: string; description?: string } | undefined;
    strictEqual(meta?.name, "generate-name");
    ok(meta?.description);
  });

  it("requires name positional", () => {
    const args = cmd.args as Record<string, { type: string; required?: boolean }>;
    strictEqual(args.name?.type, "positional");
    strictEqual(args.name?.required, true);
  });

  it("has a run function", () => {
    ok(typeof cmd.run === "function");
  });
});

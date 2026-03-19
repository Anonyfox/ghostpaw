import { ok, strictEqual } from "node:assert";
import { describe, it } from "node:test";
import cmd from "./souls_generate_description.ts";

describe("souls generate-description", () => {
  it("has correct meta", () => {
    const meta = cmd.meta as { name?: string; description?: string } | undefined;
    strictEqual(meta?.name, "generate-description");
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

import assert from "node:assert/strict";
import { describe, it } from "node:test";
import cmd from "./pack_merge_preview.ts";

describe("pack merge-preview", () => {
  it("has correct metadata", () => {
    const meta = cmd.meta as { name?: string; description?: string } | undefined;
    assert.strictEqual(meta?.name, "merge-preview");
    assert.ok(meta?.description);
  });

  it("requires keep and merge args", () => {
    const args = cmd.args as Record<string, { required?: boolean }>;
    assert.strictEqual(args.keep?.required, true);
    assert.strictEqual(args.merge?.required, true);
  });
});

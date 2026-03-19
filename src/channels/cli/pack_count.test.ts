import { ok, strictEqual } from "node:assert";
import { describe, it } from "node:test";
import cmd from "./pack_count.ts";

describe("pack count", () => {
  it("has correct meta", () => {
    const meta = cmd.meta as { name?: string; description?: string } | undefined;
    strictEqual(meta?.name, "count");
    ok(meta?.description);
  });

  it("has a run function", () => {
    ok(typeof cmd.run === "function");
  });
});

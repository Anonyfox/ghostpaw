import { ok, strictEqual } from "node:assert";
import { describe, it } from "node:test";
import cmd from "./souls_attune.ts";

describe("souls attune", () => {
  it("has correct meta", () => {
    const meta = cmd.meta as { name?: string; description?: string } | undefined;
    strictEqual(meta?.name, "attune");
    ok(meta?.description);
  });
});

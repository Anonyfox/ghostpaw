import { ok, strictEqual } from "node:assert";
import { describe, it } from "node:test";
import cmd from "./souls_shards.ts";

describe("souls shards", () => {
  it("has correct meta", () => {
    const meta = cmd.meta as { name?: string; description?: string } | undefined;
    strictEqual(meta?.name, "shards");
    ok(meta?.description);
  });
});

import { ok, strictEqual } from "node:assert";
import { describe, it } from "node:test";
import cmd from "./skills_status.ts";

describe("skills status", () => {
  it("has correct meta", () => {
    const meta = cmd.meta as { name?: string; description?: string } | undefined;
    strictEqual(meta?.name, "status");
    ok(meta?.description);
  });

  it("has a run function", () => {
    ok(typeof cmd.run === "function");
  });
});

import { ok, strictEqual } from "node:assert";
import { describe, it } from "node:test";
import cmd from "./skills_stoke.ts";

describe("skills stoke", () => {
  it("has correct meta", () => {
    const meta = cmd.meta as { name?: string; description?: string } | undefined;
    strictEqual(meta?.name, "stoke");
    ok(meta?.description);
  });

  it("has a run function", () => {
    ok(typeof cmd.run === "function");
  });
});

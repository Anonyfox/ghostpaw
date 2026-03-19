import { ok, strictEqual } from "node:assert";
import { describe, it } from "node:test";
import cmd from "./pack.ts";

describe("pack", () => {
  it("has correct meta", () => {
    const meta = cmd.meta as { name?: string; description?: string } | undefined;
    strictEqual(meta?.name, "pack");
    ok(meta?.description);
  });

  it("does not expose write subcommands directly", () => {
    const description = (cmd.meta as { description?: string } | undefined)?.description ?? "";
    ok(description.includes("subcommand"));
    ok(!description.includes("meet:"));
    ok(!description.includes("bond:"));
  });

  it("has a default run function", () => {
    ok(typeof cmd.run === "function");
  });
});

import { ok, strictEqual } from "node:assert";
import { describe, it } from "node:test";
import cmd from "./pack.ts";

describe("pack", () => {
  it("has correct meta", () => {
    const meta = cmd.meta as { name?: string; description?: string } | undefined;
    strictEqual(meta?.name, "pack");
    ok(meta?.description);
  });

  it("has subcommands", () => {
    const subs = cmd.subCommands as Record<string, unknown>;
    ok(subs.list);
    ok(subs.show);
    ok(subs.meet);
    ok(subs.bond);
    ok(subs.note);
    ok(subs.history);
    ok(subs.count);
  });

  it("has a default run function", () => {
    ok(typeof cmd.run === "function");
  });
});

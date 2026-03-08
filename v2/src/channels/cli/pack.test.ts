import { ok, strictEqual } from "node:assert";
import { describe, it } from "node:test";
import cmd from "./pack.ts";

describe("pack", () => {
  it("has correct meta", () => {
    const meta = cmd.meta as { name?: string; description?: string } | undefined;
    strictEqual(meta?.name, "pack");
    ok(meta?.description);
  });

  it("has read-only subcommands", () => {
    const subs = cmd.subCommands as Record<string, unknown>;
    ok(subs.list);
    ok(subs.show);
    ok(subs.history);
    ok(subs.count);
    strictEqual(subs.meet, undefined);
    strictEqual(subs.bond, undefined);
    strictEqual(subs.note, undefined);
  });

  it("has a default run function", () => {
    ok(typeof cmd.run === "function");
  });
});

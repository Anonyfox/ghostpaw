import { ok, strictEqual } from "node:assert";
import { describe, it } from "node:test";
import { executeHelp } from "./cmd_help.ts";
import { COMMANDS } from "./registry.ts";
import type { CommandContext } from "./types.ts";

const dummyCtx = {} as CommandContext;

describe("executeHelp", () => {
  it("lists all commands when no arg given", () => {
    const result = executeHelp(COMMANDS, dummyCtx, "");
    ok(result.text.includes("/help"));
    ok(result.text.includes("/new"));
    ok(result.text.includes("/undo"));
    ok(result.text.includes("/model"));
    ok(result.text.includes("/costs"));
    strictEqual(result.action, undefined);
  });

  it("shows detail for a specific command", () => {
    const result = executeHelp(COMMANDS, dummyCtx, "new");
    ok(result.text.includes("/new"));
    ok(result.text.includes("fresh"));
  });

  it("strips leading slash from arg", () => {
    const result = executeHelp(COMMANDS, dummyCtx, "/costs");
    ok(result.text.includes("/costs"));
    ok(!result.text.includes("Unknown"));
  });

  it("returns unknown for unrecognized command name", () => {
    const result = executeHelp(COMMANDS, dummyCtx, "nonexistent");
    ok(result.text.includes("Unknown"));
  });
});

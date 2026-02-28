import { ok, strictEqual } from "node:assert";
import { describe, it } from "node:test";
import type { TuiOptions } from "./tui.ts";
import { runTui } from "./tui.ts";

describe("runTui", () => {
  it("exports runTui as a function", () => {
    strictEqual(typeof runTui, "function");
  });

  it("TuiOptions interface is satisfiable", () => {
    const opts: TuiOptions = {
      db: {
        exec: () => {},
        prepare: () => ({ run: () => {}, get: () => null, all: () => [] }) as never,
        close: () => {},
      } as never,
      version: "0.0.1",
    };
    ok(opts.db);
    strictEqual(opts.version, "0.0.1");
  });
});

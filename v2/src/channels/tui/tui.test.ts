import { ok, strictEqual } from "node:assert";
import { describe, it } from "node:test";
import type { Entity } from "../../harness/index.ts";
import type { TuiOptions } from "./tui.ts";
import { runTui } from "./tui.ts";

describe("runTui", () => {
  it("exports runTui as a function", () => {
    strictEqual(typeof runTui, "function");
  });

  it("TuiOptions interface is satisfiable", () => {
    const mockDb = {
      exec: () => {},
      prepare: () => ({ run: () => {}, get: () => null, all: () => [] }) as never,
      close: () => {},
    } as never;
    const opts: TuiOptions = {
      db: mockDb,
      version: "0.0.1",
      entity: { db: mockDb, workspace: "/tmp" } as unknown as Entity,
    };
    ok(opts.db);
    ok(opts.entity);
    strictEqual(opts.version, "0.0.1");
  });

  it("TuiOptions accepts optional model override", () => {
    const mockDb = {
      exec: () => {},
      prepare: () => ({ run: () => {}, get: () => null, all: () => [] }) as never,
      close: () => {},
    } as never;
    const opts: TuiOptions = {
      db: mockDb,
      version: "0.0.1",
      entity: { db: mockDb, workspace: "/tmp" } as unknown as Entity,
      model: "claude-sonnet-4-6",
    };
    strictEqual(opts.model, "claude-sonnet-4-6");
  });
});

import { ok, strictEqual } from "node:assert/strict";
import { describe, it } from "node:test";
import type { DatabaseHandle } from "./database_handle.ts";

describe("DatabaseHandle", () => {
  it("defines the expected interface shape", () => {
    const handle: DatabaseHandle = {
      exec: () => {},
      prepare: () => ({
        run: () => ({ changes: 0, lastInsertRowid: 0 }),
        all: () => [],
        get: () => undefined,
      }),
      close: () => {},
    };
    ok(handle.exec);
    ok(handle.prepare);
    ok(handle.close);
  });

  it("prepare returns a StatementSync with run, all, get", () => {
    const stmt = {
      run: () => ({ changes: 1, lastInsertRowid: 42 }),
      all: () => [{ id: 1 }],
      get: () => ({ id: 1 }),
    };
    const handle: DatabaseHandle = {
      exec: () => {},
      prepare: () => stmt,
      close: () => {},
    };
    const result = handle.prepare("SELECT 1");
    strictEqual(result.run().changes, 1);
    strictEqual(result.all().length, 1);
    ok(result.get());
  });
});

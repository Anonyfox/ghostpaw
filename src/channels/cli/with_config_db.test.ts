import { ok, rejects, strictEqual } from "node:assert";
import { existsSync, mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, it } from "node:test";
import { withConfigDb } from "./with_config_db.ts";

describe("withConfigDb", () => {
  let tmp: string;
  let savedWorkspace: string | undefined;

  beforeEach(() => {
    tmp = mkdtempSync(join(tmpdir(), "gp-cfgdb-test-"));
    savedWorkspace = process.env.GHOSTPAW_WORKSPACE;
    process.env.GHOSTPAW_WORKSPACE = tmp;
  });

  afterEach(() => {
    if (savedWorkspace === undefined) delete process.env.GHOSTPAW_WORKSPACE;
    else process.env.GHOSTPAW_WORKSPACE = savedWorkspace;
    rmSync(tmp, { recursive: true, force: true });
  });

  it("opens DB, initializes config table, and passes handle to callback", async () => {
    const result = await withConfigDb((db) => {
      const rows = db
        .prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='config'")
        .all();
      return rows.length;
    });
    strictEqual(result, 1);
  });

  it("returns the callback's return value", async () => {
    const result = await withConfigDb(() => 42);
    strictEqual(result, 42);
  });

  it("creates database file in the workspace directory", async () => {
    await withConfigDb(() => {});
    ok(existsSync(join(tmp, "ghostpaw.db")));
  });

  it("closes database even when callback throws", async () => {
    await rejects(
      withConfigDb(() => {
        throw new Error("boom");
      }),
      /boom/,
    );
    ok(existsSync(join(tmp, "ghostpaw.db")));
  });

  it("handles async callbacks", async () => {
    const result = await withConfigDb(async () => {
      await new Promise((r) => setTimeout(r, 1));
      return "async-result";
    });
    strictEqual(result, "async-result");
  });
});

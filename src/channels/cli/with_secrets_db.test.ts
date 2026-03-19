import { ok, rejects, strictEqual } from "node:assert";
import { existsSync, mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, it } from "node:test";
import { withSecretsDb } from "./with_secrets_db.ts";

describe("withSecretsDb", () => {
  let tmp: string;
  let savedWorkspace: string | undefined;

  beforeEach(() => {
    tmp = mkdtempSync(join(tmpdir(), "gp-withdb-test-"));
    savedWorkspace = process.env.GHOSTPAW_WORKSPACE;
    process.env.GHOSTPAW_WORKSPACE = tmp;
  });

  afterEach(() => {
    if (savedWorkspace === undefined) delete process.env.GHOSTPAW_WORKSPACE;
    else process.env.GHOSTPAW_WORKSPACE = savedWorkspace;
    rmSync(tmp, { recursive: true, force: true });
  });

  it("opens DB, initializes secrets table, and passes handle to callback", async () => {
    const result = await withSecretsDb((db) => {
      const rows = db
        .prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='secrets'")
        .all();
      return rows.length;
    });
    strictEqual(result, 1);
  });

  it("returns the callback's return value", async () => {
    const result = await withSecretsDb(() => 42);
    strictEqual(result, 42);
  });

  it("creates database file in the workspace directory", async () => {
    await withSecretsDb(() => {});
    ok(existsSync(join(tmp, "ghostpaw.db")));
  });

  it("closes database even when callback throws", async () => {
    await rejects(
      withSecretsDb(() => {
        throw new Error("boom");
      }),
      /boom/,
    );
    ok(existsSync(join(tmp, "ghostpaw.db")));
  });

  it("handles async callbacks", async () => {
    const result = await withSecretsDb(async () => {
      await new Promise((r) => setTimeout(r, 1));
      return "async-result";
    });
    strictEqual(result, "async-result");
  });
});

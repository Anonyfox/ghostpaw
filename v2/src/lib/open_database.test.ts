import { ok } from "node:assert/strict";
import { existsSync, mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, it } from "node:test";
import { openDatabase } from "./open_database.ts";

describe("openDatabase", () => {
  let tmpDir: string;

  afterEach(() => {
    if (tmpDir) rmSync(tmpDir, { recursive: true, force: true });
  });

  it("opens a file-backed database", async () => {
    tmpDir = mkdtempSync(join(tmpdir(), "gp-test-"));
    const dbPath = join(tmpDir, "test.db");
    const db = await openDatabase(dbPath);
    ok(db.exec);
    ok(db.prepare);
    db.close();
    ok(existsSync(dbPath));
  });
});

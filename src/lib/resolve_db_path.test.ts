import { ok, strictEqual } from "node:assert";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, it } from "node:test";
import { resolveDbPath } from "./resolve_db_path.ts";

let workspace: string;

beforeEach(() => {
  workspace = mkdtempSync(join(tmpdir(), "ghostpaw-resolve-db-path-"));
});

afterEach(() => {
  rmSync(workspace, { recursive: true, force: true });
});

describe("resolveDbPath", () => {
  it("returns path under .ghostpaw/ and creates the directory", () => {
    const result = resolveDbPath(workspace);
    strictEqual(result, join(workspace, ".ghostpaw", "ghostpaw.db"));
    ok(existsSync(join(workspace, ".ghostpaw")));
  });

  it("migrates ghostpaw.db from workspace root to .ghostpaw/", () => {
    writeFileSync(join(workspace, "ghostpaw.db"), "migrated-db");

    const result = resolveDbPath(workspace);

    strictEqual(result, join(workspace, ".ghostpaw", "ghostpaw.db"));
    ok(!existsSync(join(workspace, "ghostpaw.db")));
    strictEqual(readFileSync(result, "utf-8"), "migrated-db");
  });

  it("migrates WAL and SHM files alongside the database", () => {
    writeFileSync(join(workspace, "ghostpaw.db"), "db");
    writeFileSync(join(workspace, "ghostpaw.db-wal"), "wal");
    writeFileSync(join(workspace, "ghostpaw.db-shm"), "shm");

    resolveDbPath(workspace);

    ok(!existsSync(join(workspace, "ghostpaw.db-wal")));
    ok(!existsSync(join(workspace, "ghostpaw.db-shm")));
    strictEqual(readFileSync(join(workspace, ".ghostpaw", "ghostpaw.db-wal"), "utf-8"), "wal");
    strictEqual(readFileSync(join(workspace, ".ghostpaw", "ghostpaw.db-shm"), "utf-8"), "shm");
  });

  it("prefers the new path when both old and new exist", () => {
    mkdirSync(join(workspace, ".ghostpaw"), { recursive: true });
    writeFileSync(join(workspace, ".ghostpaw", "ghostpaw.db"), "new-db");
    writeFileSync(join(workspace, "ghostpaw.db"), "old-db");

    const result = resolveDbPath(workspace);

    strictEqual(readFileSync(result, "utf-8"), "new-db");
    ok(existsSync(join(workspace, "ghostpaw.db")));
  });

  it("returns the new path without error when neither location exists", () => {
    const result = resolveDbPath(workspace);
    strictEqual(result, join(workspace, ".ghostpaw", "ghostpaw.db"));
    ok(!existsSync(result));
  });

  it("is idempotent when called multiple times", () => {
    writeFileSync(join(workspace, "ghostpaw.db"), "once");

    const first = resolveDbPath(workspace);
    const second = resolveDbPath(workspace);

    strictEqual(first, second);
    strictEqual(readFileSync(first, "utf-8"), "once");
  });
});

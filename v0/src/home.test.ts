import assert from "node:assert";
import { existsSync, mkdtempSync, rmSync } from "node:fs";
import { homedir, tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { afterEach, describe, it } from "node:test";
import { ensureHome, resolveHome } from "./home.ts";

describe("resolveHome", () => {
  const originalEnv = process.env.GHOSTPAW_HOME;

  afterEach(() => {
    if (originalEnv !== undefined) {
      process.env.GHOSTPAW_HOME = originalEnv;
    } else {
      delete process.env.GHOSTPAW_HOME;
    }
  });

  it("returns --home flag when provided", () => {
    const result = resolveHome({ home: "/tmp/custom" });
    assert.strictEqual(result, resolve("/tmp/custom"));
  });

  it("returns GHOSTPAW_HOME env when set", () => {
    process.env.GHOSTPAW_HOME = "/tmp/envhome";
    const result = resolveHome();
    assert.strictEqual(result, resolve("/tmp/envhome"));
  });

  it("defaults to ~/.ghostpaw", () => {
    delete process.env.GHOSTPAW_HOME;
    const result = resolveHome();
    assert.strictEqual(result, resolve(homedir(), ".ghostpaw"));
  });

  it("--home takes precedence over env", () => {
    process.env.GHOSTPAW_HOME = "/tmp/envhome";
    const result = resolveHome({ home: "/tmp/flaghome" });
    assert.strictEqual(result, resolve("/tmp/flaghome"));
  });
});

describe("ensureHome", () => {
  let tmpDir: string;

  afterEach(() => {
    if (tmpDir) rmSync(tmpDir, { recursive: true, force: true });
  });

  it("creates directory if it does not exist", () => {
    tmpDir = join(tmpdir(), `ghostpaw-test-${Date.now()}`);
    const deepPath = join(tmpDir, "nested", "dir");
    ensureHome(deepPath);
    assert.ok(existsSync(deepPath));
  });

  it("does not throw if directory already exists", () => {
    tmpDir = mkdtempSync(join(tmpdir(), "ghostpaw-test-"));
    assert.doesNotThrow(() => ensureHome(tmpDir));
  });
});

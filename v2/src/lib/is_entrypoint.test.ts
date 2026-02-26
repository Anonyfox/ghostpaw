import { strictEqual } from "node:assert";
import { realpathSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, it } from "node:test";
import { pathToFileURL } from "node:url";
import { isEntrypoint } from "./is_entrypoint.ts";

describe("isEntrypoint", () => {
  let savedArgv1: string;
  let tmpFile: string | undefined;

  beforeEach(() => {
    savedArgv1 = process.argv[1];
    tmpFile = undefined;
  });

  afterEach(() => {
    process.argv[1] = savedArgv1;
    if (tmpFile) rmSync(tmpFile, { force: true });
  });

  it("returns true when selfUrl matches process.argv[1]", () => {
    tmpFile = join(tmpdir(), `gp-entrypoint-test-${Date.now()}.mjs`);
    writeFileSync(tmpFile, "");
    process.argv[1] = tmpFile;
    const url = pathToFileURL(realpathSync(tmpFile)).href;
    strictEqual(isEntrypoint(url), true);
  });

  it("returns false when selfUrl does not match process.argv[1]", () => {
    process.argv[1] = "/some/other/file.mjs";
    strictEqual(isEntrypoint(import.meta.url), false);
  });

  it("returns false when selfUrl is malformed", () => {
    strictEqual(isEntrypoint("not-a-valid-url"), false);
  });

  it("returns false when process.argv[1] does not exist", () => {
    process.argv[1] = "/nonexistent/path/to/file.mjs";
    strictEqual(isEntrypoint(import.meta.url), false);
  });
});

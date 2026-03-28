import assert from "node:assert";
import { homedir } from "node:os";
import { resolve } from "node:path";
import { describe, it } from "node:test";
import { resolvePath } from "./resolve_path.ts";

const WORKSPACE = "/home/user/project";

describe("resolvePath", () => {
  it("resolves relative paths within workspace", () => {
    const result = resolvePath(WORKSPACE, "src/index.ts");
    assert.strictEqual(result.fullPath, resolve(WORKSPACE, "src/index.ts"));
    assert.strictEqual(result.outsideWorkspace, false);
  });

  it("resolves absolute paths", () => {
    const result = resolvePath(WORKSPACE, "/etc/hosts");
    assert.strictEqual(result.fullPath, resolve("/etc/hosts"));
    assert.strictEqual(result.outsideWorkspace, true);
  });

  it("expands tilde to home directory", () => {
    const result = resolvePath(WORKSPACE, "~/documents/file.txt");
    assert.strictEqual(result.fullPath, resolve(homedir(), "documents/file.txt"));
  });

  it("handles bare tilde", () => {
    const result = resolvePath(WORKSPACE, "~");
    assert.strictEqual(result.fullPath, resolve(homedir()));
  });

  it("detects paths outside workspace", () => {
    const result = resolvePath(WORKSPACE, "../other-project/file.ts");
    assert.strictEqual(result.outsideWorkspace, true);
  });

  it("does not flag workspace root as outside", () => {
    const result = resolvePath(WORKSPACE, ".");
    assert.strictEqual(result.outsideWorkspace, false);
  });
});

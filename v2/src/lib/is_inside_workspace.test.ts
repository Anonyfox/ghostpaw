import { strictEqual } from "node:assert/strict";
import { describe, it } from "node:test";
import { isInsideWorkspace } from "./is_inside_workspace.ts";

describe("isInsideWorkspace", () => {
  const ws = "/home/user/project";

  it("allows a simple relative path", () => {
    strictEqual(isInsideWorkspace(ws, "src/index.ts"), true);
  });

  it("allows a nested subdirectory", () => {
    strictEqual(isInsideWorkspace(ws, "a/b/c/d.txt"), true);
  });

  it("allows the workspace root itself", () => {
    strictEqual(isInsideWorkspace(ws, "."), true);
  });

  it("rejects path traversal with ..", () => {
    strictEqual(isInsideWorkspace(ws, "../etc/passwd"), false);
  });

  it("rejects deep path traversal", () => {
    strictEqual(isInsideWorkspace(ws, "../../secret.txt"), false);
  });

  it("rejects traversal disguised inside a path", () => {
    strictEqual(isInsideWorkspace(ws, "src/../../outside.txt"), false);
  });

  it("allows a traversal that stays inside the workspace", () => {
    strictEqual(isInsideWorkspace(ws, "src/../lib/file.ts"), true);
  });

  it("allows an absolute path inside the workspace", () => {
    strictEqual(isInsideWorkspace(ws, "/home/user/project/file.txt"), true);
  });

  it("rejects an absolute path outside the workspace", () => {
    strictEqual(isInsideWorkspace(ws, "/tmp/evil.txt"), false);
  });
});

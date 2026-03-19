import { strictEqual } from "node:assert/strict";
import { homedir } from "node:os";
import { resolve, sep } from "node:path";
import { describe, it } from "node:test";
import { resolvePath } from "./resolve_path.ts";

const ws = resolve("/home/user/project");

describe("resolvePath", () => {
  it("resolves a relative path against workspace", () => {
    const { fullPath, outsideWorkspace } = resolvePath(ws, "src/index.ts");
    strictEqual(fullPath, resolve(ws, "src/index.ts"));
    strictEqual(outsideWorkspace, false);
  });

  it("resolves workspace root '.' as inside", () => {
    const { fullPath, outsideWorkspace } = resolvePath(ws, ".");
    strictEqual(fullPath, ws);
    strictEqual(outsideWorkspace, false);
  });

  it("resolves an absolute path outside workspace", () => {
    const absPath = resolve("/tmp/other/file.txt");
    const { fullPath, outsideWorkspace } = resolvePath(ws, absPath);
    strictEqual(fullPath, absPath);
    strictEqual(outsideWorkspace, true);
  });

  it("resolves an absolute path inside workspace as inside", () => {
    const absInside = resolve(ws, "lib/utils.ts");
    const { fullPath, outsideWorkspace } = resolvePath(ws, absInside);
    strictEqual(fullPath, absInside);
    strictEqual(outsideWorkspace, false);
  });

  it("expands tilde to home directory", () => {
    const { fullPath, outsideWorkspace } = resolvePath(ws, "~/Documents/notes.txt");
    strictEqual(fullPath, resolve(homedir(), "Documents/notes.txt"));
    strictEqual(outsideWorkspace, true);
  });

  it("expands bare tilde to home directory", () => {
    const { fullPath } = resolvePath(ws, "~");
    strictEqual(fullPath, resolve(homedir()));
  });

  it("does not expand tilde in the middle of a path", () => {
    const { fullPath } = resolvePath(ws, "src/~/weird");
    strictEqual(fullPath, resolve(ws, "src/~/weird"));
  });

  it("flags .. traversal outside workspace", () => {
    const { fullPath, outsideWorkspace } = resolvePath(ws, "../sibling/file.ts");
    strictEqual(fullPath, resolve(ws, "../sibling/file.ts"));
    strictEqual(outsideWorkspace, true);
  });

  it("allows .. that stays inside workspace", () => {
    const { outsideWorkspace } = resolvePath(ws, "src/../lib/file.ts");
    strictEqual(outsideWorkspace, false);
  });

  it("handles paths with spaces", () => {
    const { fullPath, outsideWorkspace } = resolvePath(ws, "my folder/my file.ts");
    strictEqual(fullPath, resolve(ws, "my folder/my file.ts"));
    strictEqual(outsideWorkspace, false);
  });

  it("normalizes redundant separators", () => {
    const { fullPath } = resolvePath(ws, `src${sep}${sep}index.ts`);
    strictEqual(fullPath, resolve(ws, "src/index.ts"));
  });
});

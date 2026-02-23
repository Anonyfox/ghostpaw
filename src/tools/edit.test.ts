import { ok, strictEqual } from "node:assert";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, it } from "node:test";

import { createEditTool } from "./edit.js";

let workDir: string;
let editTool: ReturnType<typeof createEditTool>;

async function exec(args: Record<string, unknown>) {
  return editTool.execute({ args } as Parameters<typeof editTool.execute>[0]);
}

beforeEach(() => {
  workDir = mkdtempSync(join(tmpdir(), "ghostpaw-edit-"));
  editTool = createEditTool(workDir);
});

afterEach(() => {
  rmSync(workDir, { recursive: true, force: true });
});

describe("Edit tool", () => {
  it("has correct tool metadata", () => {
    strictEqual(editTool.name, "edit");
    ok(editTool.description.length > 0);
  });

  it("replaces a unique string in a file", async () => {
    writeFileSync(join(workDir, "test.txt"), "hello world");
    const result = (await exec({
      path: "test.txt",
      search: "world",
      replacement: "universe",
    })) as { success: boolean };
    ok(result.success);
    strictEqual(readFileSync(join(workDir, "test.txt"), "utf-8"), "hello universe");
  });

  it("handles multi-line search and replace", async () => {
    writeFileSync(join(workDir, "code.ts"), "function test() {\n  return 1;\n}\n");
    await exec({
      path: "code.ts",
      search: "function test() {\n  return 1;\n}",
      replacement: "function test() {\n  return 42;\n}",
    });
    const content = readFileSync(join(workDir, "code.ts"), "utf-8");
    ok(content.includes("return 42"));
  });

  it("returns error when search string is ambiguous", async () => {
    writeFileSync(join(workDir, "dup.txt"), "foo bar foo baz");
    const result = (await exec({
      path: "dup.txt",
      search: "foo",
      replacement: "qux",
    })) as { error: string };
    ok(result.error);
    ok(result.error.includes("2 matches"));
  });

  it("returns error when search string is not found", async () => {
    writeFileSync(join(workDir, "test.txt"), "hello world");
    const result = (await exec({
      path: "test.txt",
      search: "goodbye",
      replacement: "x",
    })) as { error: string };
    ok(result.error);
    ok(result.error.includes("not found"));
  });

  it("returns error for non-existent file", async () => {
    const result = (await exec({
      path: "nope.txt",
      search: "x",
      replacement: "y",
    })) as { error: string };
    ok(result.error);
  });

  it("prevents path traversal", async () => {
    const result = (await exec({
      path: "../../etc/passwd",
      search: "x",
      replacement: "y",
    })) as { error: string };
    ok(result.error);
  });

  it("falls back to fuzzy whitespace match", async () => {
    writeFileSync(join(workDir, "ws.txt"), "  function hello()  {\n    return true;\n  }");
    const result = (await exec({
      path: "ws.txt",
      search: "function hello() {\n  return true;\n}",
      replacement: "function hello() {\n  return false;\n}",
    })) as { success: boolean; matchKind: string };
    ok(result.success);
    strictEqual(result.matchKind, "fuzzy");
    const content = readFileSync(join(workDir, "ws.txt"), "utf-8");
    ok(content.includes("return false"));
  });

  it("reports match kind in result", async () => {
    writeFileSync(join(workDir, "test.txt"), "exact match here");
    const result = (await exec({
      path: "test.txt",
      search: "exact match",
      replacement: "precise match",
    })) as { matchKind: string };
    strictEqual(result.matchKind, "exact");
  });

  it("can delete content by replacing with empty string", async () => {
    writeFileSync(join(workDir, "test.txt"), "keep this remove this keep this too");
    await exec({ path: "test.txt", search: " remove this", replacement: "" });
    strictEqual(readFileSync(join(workDir, "test.txt"), "utf-8"), "keep this keep this too");
  });
});

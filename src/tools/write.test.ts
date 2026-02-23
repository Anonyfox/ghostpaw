import { ok, strictEqual } from "node:assert";
import { existsSync, mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, it } from "node:test";

import { createWriteTool } from "./write.js";

let workDir: string;
let writeTool: ReturnType<typeof createWriteTool>;

async function exec(args: Record<string, unknown>) {
  return writeTool.execute({ args } as Parameters<typeof writeTool.execute>[0]);
}

beforeEach(() => {
  workDir = mkdtempSync(join(tmpdir(), "ghostpaw-write-"));
  writeTool = createWriteTool(workDir);
});

afterEach(() => {
  rmSync(workDir, { recursive: true, force: true });
});

describe("Write tool", () => {
  it("has correct tool metadata", () => {
    strictEqual(writeTool.name, "write");
    ok(writeTool.description.length > 0);
  });

  it("creates a new file", async () => {
    await exec({ path: "new.txt", content: "hello world" });
    strictEqual(readFileSync(join(workDir, "new.txt"), "utf-8"), "hello world");
  });

  it("overwrites existing file", async () => {
    await exec({ path: "file.txt", content: "first" });
    await exec({ path: "file.txt", content: "second" });
    strictEqual(readFileSync(join(workDir, "file.txt"), "utf-8"), "second");
  });

  it("creates intermediate directories automatically", async () => {
    await exec({ path: "a/b/c/deep.txt", content: "nested" });
    strictEqual(readFileSync(join(workDir, "a/b/c/deep.txt"), "utf-8"), "nested");
  });

  it("writes empty files", async () => {
    await exec({ path: "empty.txt", content: "" });
    ok(existsSync(join(workDir, "empty.txt")));
    strictEqual(readFileSync(join(workDir, "empty.txt"), "utf-8"), "");
  });

  it("prevents path traversal outside workspace", async () => {
    const result = (await exec({ path: "../../etc/evil", content: "hacked" })) as {
      error: string;
    };
    ok(result.error);
    ok(
      result.error.toLowerCase().includes("outside") ||
        result.error.toLowerCase().includes("denied"),
    );
  });

  it("returns success confirmation", async () => {
    const result = (await exec({ path: "ok.txt", content: "done" })) as {
      success: boolean;
      path: string;
      bytes: number;
    };
    ok(result.success);
    strictEqual(result.path, "ok.txt");
    strictEqual(result.bytes, 4);
  });

  it("handles multi-line content", async () => {
    const content = "line 1\nline 2\nline 3\n";
    await exec({ path: "multi.txt", content });
    strictEqual(readFileSync(join(workDir, "multi.txt"), "utf-8"), content);
  });

  it("handles unicode content", async () => {
    const content = "こんにちは 🌍 مرحبا";
    await exec({ path: "unicode.txt", content });
    strictEqual(readFileSync(join(workDir, "unicode.txt"), "utf-8"), content);
  });
});

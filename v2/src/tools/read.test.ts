import { ok, strictEqual } from "node:assert/strict";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, it } from "node:test";
import { createReadTool } from "./read.ts";

let workDir: string;
let execute: (args: Record<string, unknown>) => Promise<unknown>;

beforeEach(() => {
  workDir = mkdtempSync(join(tmpdir(), "ghostpaw-read-"));
  const tool = createReadTool(workDir);
  execute = (args) => tool.execute({ args, ctx: { model: "test", provider: "test" } });
});

afterEach(() => {
  rmSync(workDir, { recursive: true, force: true });
});

describe("read tool", () => {
  it("has correct tool metadata", () => {
    const tool = createReadTool(workDir);
    strictEqual(tool.name, "read");
    ok(tool.description.length > 20);
  });

  it("reads entire file contents", async () => {
    writeFileSync(join(workDir, "test.txt"), "hello world\nsecond line\n");
    const result = (await execute({ path: "test.txt" })) as { content: string };
    ok(result.content.includes("hello world"));
    ok(result.content.includes("second line"));
  });

  it("prefixes each line with a line number", async () => {
    writeFileSync(join(workDir, "test.txt"), "line 1\nline 2\nline 3\n");
    const result = (await execute({ path: "test.txt" })) as { content: string };
    ok(result.content.includes("1|"));
    ok(result.content.includes("2|"));
  });

  it("supports line range with startLine and endLine", async () => {
    const content = Array.from({ length: 20 }, (_, i) => `line ${i + 1}`).join("\n");
    writeFileSync(join(workDir, "big.txt"), content);
    const result = (await execute({ path: "big.txt", startLine: 5, endLine: 10 })) as {
      content: string;
    };
    ok(result.content.includes("line 5"));
    ok(result.content.includes("line 10"));
    ok(!result.content.includes("line 4\n"));
    ok(!result.content.includes("line 11"));
  });

  it("handles startLine only (reads to end)", async () => {
    writeFileSync(join(workDir, "test.txt"), "a\nb\nc\nd\ne\n");
    const result = (await execute({ path: "test.txt", startLine: 3 })) as { content: string };
    ok(result.content.includes("c"));
    ok(result.content.includes("d"));
    ok(result.content.includes("e"));
  });

  it("returns error for non-existent file", async () => {
    const result = (await execute({ path: "nope.txt" })) as { error: string };
    ok(result.error);
    ok(result.error.includes("nope.txt"));
  });

  it("reads files in subdirectories", async () => {
    mkdirSync(join(workDir, "sub"));
    writeFileSync(join(workDir, "sub", "file.txt"), "nested content");
    const result = (await execute({ path: "sub/file.txt" })) as { content: string };
    ok(result.content.includes("nested content"));
  });

  it("prevents path traversal outside workspace", async () => {
    const result = (await execute({ path: "../../etc/passwd" })) as { error: string };
    ok(result.error);
    ok(
      result.error.toLowerCase().includes("outside") ||
        result.error.toLowerCase().includes("denied"),
    );
  });

  it("handles empty files", async () => {
    writeFileSync(join(workDir, "empty.txt"), "");
    const result = (await execute({ path: "empty.txt" })) as { content: string };
    strictEqual(typeof result.content, "string");
  });

  it("detects binary files and returns error", async () => {
    writeFileSync(join(workDir, "bin.dat"), Buffer.from([0x00, 0x01, 0xff, 0xfe]));
    const result = (await execute({ path: "bin.dat" })) as { error: string; bytes: number };
    ok(result.error);
    ok(result.error.includes("binary"));
    ok(typeof result.bytes === "number");
  });

  it("returns lines and bytes metadata", async () => {
    writeFileSync(join(workDir, "meta.txt"), "line1\nline2\nline3");
    const result = (await execute({ path: "meta.txt" })) as {
      lines: number;
      bytes: number;
      content: string;
    };
    strictEqual(result.lines, 3);
    strictEqual(result.bytes, 17);
    ok(result.content.includes("1|line1"));
  });

  it("returns lines and bytes for ranged reads", async () => {
    writeFileSync(join(workDir, "ranged.txt"), "a\nb\nc\nd\ne");
    const result = (await execute({ path: "ranged.txt", startLine: 2, endLine: 3 })) as {
      lines: number;
      bytes: number;
      range: string;
      content: string;
    };
    strictEqual(result.lines, 5);
    strictEqual(result.range, "2-3");
    ok(result.content.includes("b"));
  });

  it("warns on single-line large file (likely garbled)", async () => {
    const garbled = `#!/usr/bin/env node${"\\nimport fs from 'fs';".repeat(50)}`;
    writeFileSync(join(workDir, "garbled.mjs"), garbled);
    const result = (await execute({ path: "garbled.mjs" })) as {
      lines: number;
      warning: string;
      content: string;
    };
    strictEqual(result.lines, 1);
    ok(result.warning.includes("single line"));
    ok(result.warning.includes("corrupted"));
  });

  it("warns on HTML entities in non-HTML file", async () => {
    writeFileSync(join(workDir, "bad.js"), "if (a &lt; b &amp;&amp; c &gt; d) {}");
    const result = (await execute({ path: "bad.js" })) as { warning: string };
    ok(result.warning.includes("HTML entities"));
  });

  it("does NOT warn on HTML entities in .html files", async () => {
    writeFileSync(join(workDir, "ok.html"), "a &lt; b &amp; c");
    const result = (await execute({ path: "ok.html" })) as { warning?: string };
    strictEqual(result.warning, undefined);
  });

  it("no warning for normal multi-line files", async () => {
    writeFileSync(join(workDir, "normal.js"), "const a = 1;\nconst b = 2;\n");
    const result = (await execute({ path: "normal.js" })) as { warning?: string };
    strictEqual(result.warning, undefined);
  });

  it("truncates content at maxChars", async () => {
    const content = Array.from({ length: 100 }, (_, i) => `line ${i + 1}`).join("\n");
    writeFileSync(join(workDir, "big.txt"), content);
    const result = (await execute({ path: "big.txt", maxChars: 50 })) as {
      content: string;
      truncated: boolean;
      notice: string;
      lines: number;
    };
    ok(result.truncated);
    ok(result.content.length <= 50);
    ok(result.notice.includes("Truncated"));
    strictEqual(result.lines, 100);
  });

  it("does not truncate when maxChars exceeds content", async () => {
    writeFileSync(join(workDir, "small.txt"), "tiny file\n");
    const result = (await execute({ path: "small.txt", maxChars: 10000 })) as {
      content: string;
      truncated?: boolean;
    };
    ok(!result.truncated);
  });

  it("truncates ranged reads with maxChars", async () => {
    const content = Array.from({ length: 100 }, (_, i) => `line ${i + 1}`).join("\n");
    writeFileSync(join(workDir, "big.txt"), content);
    const result = (await execute({
      path: "big.txt",
      startLine: 1,
      endLine: 50,
      maxChars: 30,
    })) as {
      content: string;
      truncated: boolean;
    };
    ok(result.truncated);
    ok(result.content.length <= 30);
  });

  it("returns error for empty path", async () => {
    const result = (await execute({ path: "" })) as { error: string };
    ok(result.error);
  });

  it("returns error for whitespace-only path", async () => {
    const result = (await execute({ path: "   " })) as { error: string };
    ok(result.error);
  });
});

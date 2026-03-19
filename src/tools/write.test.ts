import { ok, strictEqual } from "node:assert/strict";
import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, it } from "node:test";
import { createWriteTool } from "./write.ts";

let workDir: string;
let execute: (args: Record<string, unknown>) => Promise<unknown>;

beforeEach(() => {
  workDir = mkdtempSync(join(tmpdir(), "ghostpaw-write-"));
  const tool = createWriteTool(workDir);
  execute = (args) => tool.execute({ args, ctx: { model: "test", provider: "test" } });
});

afterEach(() => {
  rmSync(workDir, { recursive: true, force: true });
});

describe("write tool", () => {
  it("has correct tool metadata", () => {
    const tool = createWriteTool(workDir);
    strictEqual(tool.name, "write");
    ok(tool.description.length > 20);
  });

  it("creates a new file", async () => {
    await execute({ path: "new.txt", content: "hello world" });
    strictEqual(readFileSync(join(workDir, "new.txt"), "utf-8"), "hello world");
  });

  it("overwrites existing file", async () => {
    await execute({ path: "file.txt", content: "first" });
    await execute({ path: "file.txt", content: "second" });
    strictEqual(readFileSync(join(workDir, "file.txt"), "utf-8"), "second");
  });

  it("creates intermediate directories automatically", async () => {
    await execute({ path: "a/b/c/deep.txt", content: "nested" });
    strictEqual(readFileSync(join(workDir, "a/b/c/deep.txt"), "utf-8"), "nested");
  });

  it("writes empty new files", async () => {
    await execute({ path: "empty.txt", content: "" });
    ok(existsSync(join(workDir, "empty.txt")));
    strictEqual(readFileSync(join(workDir, "empty.txt"), "utf-8"), "");
  });

  it("rejects empty content for existing files", async () => {
    writeFileSync(join(workDir, "existing.txt"), "important data");
    const result = (await execute({ path: "existing.txt", content: "" })) as { error: string };
    ok(result.error);
    ok(result.error.includes("Refusing"));
    strictEqual(readFileSync(join(workDir, "existing.txt"), "utf-8"), "important data");
  });

  it("writes outside workspace with notice", async () => {
    const extDir = mkdtempSync(join(tmpdir(), "ghostpaw-write-ext-"));
    try {
      const absPath = join(extDir, "external.txt");
      const result = (await execute({ path: absPath, content: "external data" })) as {
        success: boolean;
        notice?: string;
      };
      ok(result.success);
      ok(result.notice);
      ok(result.notice.includes("outside workspace"));
      strictEqual(readFileSync(absPath, "utf-8"), "external data");
    } finally {
      rmSync(extDir, { recursive: true, force: true });
    }
  });

  it("returns success confirmation with bytes", async () => {
    const result = (await execute({ path: "ok.txt", content: "done" })) as {
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
    await execute({ path: "multi.txt", content });
    strictEqual(readFileSync(join(workDir, "multi.txt"), "utf-8"), content);
  });

  it("handles unicode content", async () => {
    const content = "こんにちは 🌍 مرحبا";
    await execute({ path: "unicode.txt", content });
    strictEqual(readFileSync(join(workDir, "unicode.txt"), "utf-8"), content);
  });

  it("sanitizes HTML entities in non-HTML files", async () => {
    await execute({ path: "code.js", content: "if (a &lt; b &amp;&amp; c &gt; d) {}" });
    strictEqual(readFileSync(join(workDir, "code.js"), "utf-8"), "if (a < b && c > d) {}");
  });

  it("does NOT sanitize HTML entities in .html files", async () => {
    const content = "a &lt; b &amp;&amp; c &gt; d";
    await execute({ path: "page.html", content });
    strictEqual(readFileSync(join(workDir, "page.html"), "utf-8"), content);
  });

  it("converts literal \\n to real newlines when no real newlines exist", async () => {
    await execute({ path: "script.mjs", content: "line1\\nline2\\nline3" });
    strictEqual(readFileSync(join(workDir, "script.mjs"), "utf-8"), "line1\nline2\nline3");
  });

  it("does NOT convert \\n when real newlines already exist", async () => {
    const content = "line1\nhas \\n literal in it\nline3";
    await execute({ path: "mixed.txt", content });
    strictEqual(readFileSync(join(workDir, "mixed.txt"), "utf-8"), content);
  });

  it("fixes both HTML entities and literal newlines together", async () => {
    await execute({
      path: "audit.mjs",
      content: "#!/usr/bin/env node\\nimport fs from 'fs';\\nif (a &lt; b &amp;&amp; c &gt; d) {}",
    });
    strictEqual(
      readFileSync(join(workDir, "audit.mjs"), "utf-8"),
      "#!/usr/bin/env node\nimport fs from 'fs';\nif (a < b && c > d) {}",
    );
  });

  it("returns sanitized flag when content was fixed", async () => {
    const result = (await execute({ path: "fix.js", content: "a &amp; b" })) as {
      success: boolean;
      sanitized?: boolean;
    };
    ok(result.success);
    strictEqual(result.sanitized, true);
  });

  it("returns error for empty path", async () => {
    const result = (await execute({ path: "", content: "data" })) as { error: string };
    ok(result.error);
  });

  it("returns error for whitespace-only path", async () => {
    const result = (await execute({ path: "   ", content: "data" })) as { error: string };
    ok(result.error);
  });
});

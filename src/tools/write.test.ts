import { ok, strictEqual } from "node:assert";
import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, it } from "node:test";

import { createWriteTool, sanitizeLlmContent } from "./write.js";

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

  it("writes empty new files", async () => {
    await exec({ path: "empty.txt", content: "" });
    ok(existsSync(join(workDir, "empty.txt")));
    strictEqual(readFileSync(join(workDir, "empty.txt"), "utf-8"), "");
  });

  it("rejects empty content for existing files", async () => {
    writeFileSync(join(workDir, "existing.txt"), "important data");
    const result = (await exec({ path: "existing.txt", content: "" })) as { error: string };
    ok(result.error);
    ok(result.error.includes("Refusing"));
    strictEqual(readFileSync(join(workDir, "existing.txt"), "utf-8"), "important data");
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

  it("sanitizes HTML entities in non-HTML files", async () => {
    await exec({ path: "code.js", content: "if (a &lt; b &amp;&amp; c &gt; d) {}" });
    strictEqual(readFileSync(join(workDir, "code.js"), "utf-8"), "if (a < b && c > d) {}");
  });

  it("does NOT sanitize HTML entities in .html files", async () => {
    const content = "a &lt; b &amp;&amp; c &gt; d";
    await exec({ path: "page.html", content });
    strictEqual(readFileSync(join(workDir, "page.html"), "utf-8"), content);
  });

  it("converts literal \\n to real newlines when no real newlines exist", async () => {
    await exec({ path: "script.mjs", content: "line1\\nline2\\nline3" });
    strictEqual(readFileSync(join(workDir, "script.mjs"), "utf-8"), "line1\nline2\nline3");
  });

  it("does NOT convert \\n when real newlines already exist", async () => {
    const content = "line1\nhas \\n literal in it\nline3";
    await exec({ path: "mixed.txt", content });
    strictEqual(readFileSync(join(workDir, "mixed.txt"), "utf-8"), content);
  });

  it("fixes both HTML entities and literal newlines together", async () => {
    await exec({
      path: "audit.mjs",
      content: "#!/usr/bin/env node\\nimport fs from 'fs';\\nif (a &lt; b &amp;&amp; c &gt; d) {}",
    });
    strictEqual(
      readFileSync(join(workDir, "audit.mjs"), "utf-8"),
      "#!/usr/bin/env node\nimport fs from 'fs';\nif (a < b && c > d) {}",
    );
  });

  it("returns sanitized flag when content was fixed", async () => {
    const result = (await exec({ path: "fix.js", content: "a &amp; b" })) as {
      success: boolean;
      sanitized?: boolean;
    };
    ok(result.success);
    strictEqual(result.sanitized, true);
  });
});

describe("sanitizeLlmContent", () => {
  it("unescapes common HTML entities", () => {
    strictEqual(sanitizeLlmContent("a &amp;&amp; b", "x.js"), "a && b");
    strictEqual(sanitizeLlmContent("x &lt; y", "x.js"), "x < y");
    strictEqual(sanitizeLlmContent("x &gt; y", "x.js"), "x > y");
    strictEqual(sanitizeLlmContent("&quot;hi&quot;", "x.js"), '"hi"');
  });

  it("skips HTML entity unescaping for .html files", () => {
    strictEqual(sanitizeLlmContent("a &amp; b", "page.html"), "a &amp; b");
    strictEqual(sanitizeLlmContent("a &amp; b", "page.HTML"), "a &amp; b");
  });

  it("converts literal \\n to newlines when no real newlines exist", () => {
    strictEqual(sanitizeLlmContent("a\\nb\\nc", "x.js"), "a\nb\nc");
  });

  it("preserves content with real newlines", () => {
    strictEqual(sanitizeLlmContent("a\nb\nc", "x.js"), "a\nb\nc");
  });

  it("handles empty/short content unchanged", () => {
    strictEqual(sanitizeLlmContent("", "x.js"), "");
    strictEqual(sanitizeLlmContent("a", "x.js"), "a");
  });
});

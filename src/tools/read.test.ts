import { ok, strictEqual } from "node:assert";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, it } from "node:test";

import { createReadTool } from "./read.js";

let workDir: string;
let readTool: ReturnType<typeof createReadTool>;

async function exec(args: Record<string, unknown>) {
  return readTool.execute({ args } as Parameters<typeof readTool.execute>[0]);
}

beforeEach(() => {
  workDir = mkdtempSync(join(tmpdir(), "ghostpaw-read-"));
  readTool = createReadTool(workDir);
});

afterEach(() => {
  rmSync(workDir, { recursive: true, force: true });
});

describe("Read tool", () => {
  it("has correct tool metadata", () => {
    strictEqual(readTool.name, "read");
    ok(readTool.description.length > 0);
  });

  it("reads entire file contents", async () => {
    writeFileSync(join(workDir, "test.txt"), "hello world\nsecond line\n");
    const result = (await exec({ path: "test.txt" })) as { content: string };
    ok(result.content.includes("hello world"));
    ok(result.content.includes("second line"));
  });

  it("reads with line numbers", async () => {
    writeFileSync(join(workDir, "test.txt"), "line 1\nline 2\nline 3\n");
    const result = (await exec({ path: "test.txt" })) as { content: string };
    ok(result.content.includes("1|"));
    ok(result.content.includes("2|"));
  });

  it("supports line range with startLine and endLine", async () => {
    const content = Array.from({ length: 20 }, (_, i) => `line ${i + 1}`).join("\n");
    writeFileSync(join(workDir, "big.txt"), content);
    const result = (await exec({ path: "big.txt", startLine: 5, endLine: 10 })) as {
      content: string;
    };
    ok(result.content.includes("line 5"));
    ok(result.content.includes("line 10"));
    ok(!result.content.includes("line 4\n"));
    ok(!result.content.includes("line 11"));
  });

  it("handles startLine only (reads to end)", async () => {
    writeFileSync(join(workDir, "test.txt"), "a\nb\nc\nd\ne\n");
    const result = (await exec({ path: "test.txt", startLine: 3 })) as { content: string };
    ok(result.content.includes("c"));
    ok(result.content.includes("d"));
    ok(result.content.includes("e"));
  });

  it("returns error for non-existent file", async () => {
    const result = (await exec({ path: "nope.txt" })) as { error: string };
    ok(result.error);
    ok(result.error.includes("nope.txt"));
  });

  it("reads files in subdirectories", async () => {
    mkdirSync(join(workDir, "sub"));
    writeFileSync(join(workDir, "sub", "file.txt"), "nested content");
    const result = (await exec({ path: "sub/file.txt" })) as { content: string };
    ok(result.content.includes("nested content"));
  });

  it("prevents path traversal outside workspace", async () => {
    const result = (await exec({ path: "../../etc/passwd" })) as { error: string };
    ok(result.error);
    ok(
      result.error.toLowerCase().includes("outside") ||
        result.error.toLowerCase().includes("denied"),
    );
  });

  it("handles empty files", async () => {
    writeFileSync(join(workDir, "empty.txt"), "");
    const result = (await exec({ path: "empty.txt" })) as { content: string };
    strictEqual(typeof result.content, "string");
  });

  it("handles binary-like files gracefully", async () => {
    writeFileSync(join(workDir, "bin.dat"), Buffer.from([0x00, 0x01, 0xff, 0xfe]));
    const result = await exec({ path: "bin.dat" });
    ok(result);
  });
});

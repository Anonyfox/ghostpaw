import { ok, strictEqual } from "node:assert/strict";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, it } from "node:test";
import { createEditTool } from "./edit.ts";

let workDir: string;
let editTool: ReturnType<typeof createEditTool>;

async function exec(args: Record<string, unknown>) {
  return editTool.execute({ args, ctx: { model: "test", provider: "test" } });
}

beforeEach(() => {
  workDir = mkdtempSync(join(tmpdir(), "ghostpaw-edit-"));
  editTool = createEditTool(workDir);
});

afterEach(() => {
  rmSync(workDir, { recursive: true, force: true });
});

describe("edit — single edit", () => {
  it("has correct tool metadata", () => {
    strictEqual(editTool.name, "edit");
    ok(editTool.description.length > 0);
  });

  it("replaces a unique string in a file", async () => {
    writeFileSync(join(workDir, "test.txt"), "hello world");
    const result = (await exec({ path: "test.txt", search: "world", replacement: "universe" })) as {
      success: boolean;
    };
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
    const result = (await exec({ path: "dup.txt", search: "foo", replacement: "qux" })) as {
      error: string;
    };
    ok(result.error);
    ok(result.error.includes("2 matches"));
  });

  it("returns error when search string is not found", async () => {
    writeFileSync(join(workDir, "test.txt"), "hello world");
    const result = (await exec({ path: "test.txt", search: "goodbye", replacement: "x" })) as {
      error: string;
    };
    ok(result.error);
    ok(result.error.includes("not found"));
  });

  it("returns error for non-existent file", async () => {
    const result = (await exec({ path: "nope.txt", search: "x", replacement: "y" })) as {
      error: string;
    };
    ok(result.error);
  });

  it("allows paths outside workspace (file-not-found, not access-denied)", async () => {
    const result = (await exec({
      path: "../../etc/nonexistent_test_file",
      search: "x",
      replacement: "y",
    })) as { error: string };
    ok(result.error);
    ok(result.error.includes("Failed to read"), "should get file-not-found, not access-denied");
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
    ok(readFileSync(join(workDir, "ws.txt"), "utf-8").includes("return false"));
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

describe("edit — no-op detection", () => {
  it("rejects when search equals replacement", async () => {
    writeFileSync(join(workDir, "test.txt"), "hello world");
    const result = (await exec({
      path: "test.txt",
      search: "hello",
      replacement: "hello",
    })) as { error: string };
    ok(result.error);
    ok(result.error.includes("identical"));
    strictEqual(readFileSync(join(workDir, "test.txt"), "utf-8"), "hello world");
  });
});

describe("edit — empty file protection", () => {
  it("rejects edit that would empty the file", async () => {
    writeFileSync(join(workDir, "test.txt"), "only content");
    const result = (await exec({
      path: "test.txt",
      search: "only content",
      replacement: "",
    })) as { error: string };
    ok(result.error);
    ok(result.error.includes("empty file"));
    strictEqual(readFileSync(join(workDir, "test.txt"), "utf-8"), "only content");
  });
});

describe("edit — size warnings", () => {
  it("warns when file shrinks significantly", async () => {
    const big = `${"A".repeat(200)}\nkeep\n`;
    writeFileSync(join(workDir, "big.txt"), big);
    const result = (await exec({
      path: "big.txt",
      search: "A".repeat(200),
      replacement: "B",
    })) as { success: boolean; warning?: string };
    ok(result.success);
    ok(result.warning);
    ok(result.warning!.includes("shrank"));
  });
});

describe("edit — replaceAll", () => {
  it("replaces all occurrences", async () => {
    writeFileSync(join(workDir, "test.txt"), "foo bar foo baz foo");
    const result = (await exec({
      path: "test.txt",
      search: "foo",
      replacement: "qux",
      replaceAll: true,
    })) as { success: boolean; replacements: number };
    ok(result.success);
    strictEqual(result.replacements, 3);
    strictEqual(readFileSync(join(workDir, "test.txt"), "utf-8"), "qux bar qux baz qux");
  });

  it("returns error when pattern not found", async () => {
    writeFileSync(join(workDir, "test.txt"), "hello world");
    const result = (await exec({
      path: "test.txt",
      search: "zzz",
      replacement: "aaa",
      replaceAll: true,
    })) as { error: string };
    ok(result.error);
    ok(result.error.includes("not found"));
  });

  it("rejects replaceAll that empties the file", async () => {
    writeFileSync(join(workDir, "test.txt"), "aaa");
    const result = (await exec({
      path: "test.txt",
      search: "aaa",
      replacement: "",
      replaceAll: true,
    })) as { error: string };
    ok(result.error);
    ok(result.error.includes("empty file"));
    strictEqual(readFileSync(join(workDir, "test.txt"), "utf-8"), "aaa");
  });

  it("warns on large shrink with replaceAll", async () => {
    const content = `${"remove_me ".repeat(30)}keep`;
    writeFileSync(join(workDir, "test.txt"), content);
    const result = (await exec({
      path: "test.txt",
      search: "remove_me ",
      replacement: "",
      replaceAll: true,
    })) as { success: boolean; warning?: string };
    ok(result.success);
    ok(result.warning);
    ok(result.warning!.includes("shrank"));
  });
});

describe("edit — insertAfterLine", () => {
  it("inserts at the beginning of file (line 0)", async () => {
    writeFileSync(join(workDir, "test.txt"), "line1\nline2\n");
    const result = (await exec({
      path: "test.txt",
      insertAfterLine: 0,
      content: "inserted",
    })) as { success: boolean; insertedAtLine: number };
    ok(result.success);
    strictEqual(result.insertedAtLine, 0);
    ok(readFileSync(join(workDir, "test.txt"), "utf-8").startsWith("inserted\nline1"));
  });

  it("inserts after a specific line", async () => {
    writeFileSync(join(workDir, "test.txt"), "line1\nline2\nline3\n");
    const result = (await exec({
      path: "test.txt",
      insertAfterLine: 2,
      content: "new_line",
    })) as { success: boolean; insertedAtLine: number };
    ok(result.success);
    strictEqual(result.insertedAtLine, 2);
    const lines = readFileSync(join(workDir, "test.txt"), "utf-8").split("\n");
    strictEqual(lines[2], "new_line");
  });

  it("inserts multi-line content", async () => {
    writeFileSync(join(workDir, "test.txt"), "a\nb\n");
    const result = (await exec({
      path: "test.txt",
      insertAfterLine: 1,
      content: "x\ny\nz",
    })) as { success: boolean; linesInserted: number };
    ok(result.success);
    strictEqual(result.linesInserted, 3);
  });

  it("clamps out-of-bounds line to end of file", async () => {
    writeFileSync(join(workDir, "test.txt"), "a\nb\n");
    const result = (await exec({
      path: "test.txt",
      insertAfterLine: 999,
      content: "appended",
    })) as { success: boolean; notice?: string };
    ok(result.success);
    ok(result.notice);
    ok(result.notice!.includes("exceeds"));
  });

  it("rejects insert with empty content", async () => {
    writeFileSync(join(workDir, "test.txt"), "content");
    const result = (await exec({
      path: "test.txt",
      insertAfterLine: 1,
      content: "",
    })) as { error: string };
    ok(result.error);
    ok(result.error.includes("Nothing to insert"));
  });

  it("does not enter insert mode without content parameter", async () => {
    writeFileSync(join(workDir, "test.txt"), "line1\n");
    const result = (await exec({
      path: "test.txt",
      insertAfterLine: 1,
      replacement: "via_replacement",
    })) as { error: string };
    ok(result.error);
    ok(result.error.includes("Missing"));
  });
});

describe("edit — batch edits", () => {
  it("applies multiple edits atomically", async () => {
    writeFileSync(join(workDir, "test.txt"), "alpha beta gamma delta");
    const result = (await exec({
      path: "test.txt",
      edits: JSON.stringify([
        { search: "alpha", replacement: "ALPHA" },
        { search: "gamma", replacement: "GAMMA" },
      ]),
    })) as { success: boolean; editsApplied: number; matchKinds: string[] };
    ok(result.success);
    strictEqual(result.editsApplied, 2);
    strictEqual(result.matchKinds.length, 2);
    const content = readFileSync(join(workDir, "test.txt"), "utf-8");
    ok(content.includes("ALPHA"));
    ok(content.includes("GAMMA"));
    ok(content.includes("beta"));
  });

  it("rejects entire batch if any edit fails", async () => {
    writeFileSync(join(workDir, "test.txt"), "alpha beta gamma");
    const result = (await exec({
      path: "test.txt",
      edits: JSON.stringify([
        { search: "alpha", replacement: "ALPHA" },
        { search: "nonexistent", replacement: "X" },
      ]),
    })) as { error: string };
    ok(result.error);
    ok(result.error.includes("edits[1]"));
    strictEqual(readFileSync(join(workDir, "test.txt"), "utf-8"), "alpha beta gamma");
  });

  it("rejects batch that would empty file", async () => {
    writeFileSync(join(workDir, "test.txt"), "only");
    const result = (await exec({
      path: "test.txt",
      edits: JSON.stringify([{ search: "only", replacement: "" }]),
    })) as { error: string };
    ok(result.error);
    ok(result.error.includes("empty file"));
    strictEqual(readFileSync(join(workDir, "test.txt"), "utf-8"), "only");
  });

  it("rejects invalid JSON in edits", async () => {
    writeFileSync(join(workDir, "test.txt"), "content");
    const result = (await exec({ path: "test.txt", edits: "not json" })) as { error: string };
    ok(result.error);
    ok(result.error.includes("valid JSON"));
  });

  it("rejects edits with missing fields", async () => {
    writeFileSync(join(workDir, "test.txt"), "content");
    const result = (await exec({
      path: "test.txt",
      edits: JSON.stringify([{ search: "content" }]),
    })) as { error: string };
    ok(result.error);
    ok(result.error.includes("edits[0]"));
  });

  it("rejects empty edits array", async () => {
    writeFileSync(join(workDir, "test.txt"), "content");
    const result = (await exec({ path: "test.txt", edits: "[]" })) as { error: string };
    ok(result.error);
    ok(result.error.includes("non-empty"));
  });

  it("detects no-op in batch edits", async () => {
    writeFileSync(join(workDir, "test.txt"), "alpha beta");
    const result = (await exec({
      path: "test.txt",
      edits: JSON.stringify([{ search: "alpha", replacement: "alpha" }]),
    })) as { error: string };
    ok(result.error);
    ok(result.error.includes("identical"));
  });

  it("warns on large batch shrink", async () => {
    const content = `${"A".repeat(200)} keep`;
    writeFileSync(join(workDir, "test.txt"), content);
    const result = (await exec({
      path: "test.txt",
      edits: JSON.stringify([{ search: "A".repeat(200), replacement: "B" }]),
    })) as { success: boolean; warning?: string };
    ok(result.success);
    ok(result.warning);
    ok(result.warning!.includes("shrank"));
  });
});

describe("edit — parameter validation", () => {
  it("returns error when no mode parameters given", async () => {
    writeFileSync(join(workDir, "test.txt"), "content");
    const result = (await exec({ path: "test.txt" })) as { error: string };
    ok(result.error);
    ok(result.error.includes("Missing"));
  });

  it("returns error for empty path", async () => {
    const result = (await exec({ path: "", search: "x", replacement: "y" })) as { error: string };
    ok(result.error);
    ok(result.error.includes("empty"));
  });

  it("returns error for whitespace-only path", async () => {
    const result = (await exec({ path: "  ", search: "x", replacement: "y" })) as {
      error: string;
    };
    ok(result.error);
    ok(result.error.includes("empty"));
  });
});

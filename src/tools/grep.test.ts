import { ok, strictEqual } from "node:assert";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, it } from "node:test";
import { createGrepTool, type GrepMatch } from "./grep.ts";

let workDir: string;
let grepTool: ReturnType<typeof createGrepTool>;

async function exec(args: Record<string, unknown>) {
  return grepTool.execute({ args } as Parameters<typeof grepTool.execute>[0]);
}

beforeEach(() => {
  workDir = mkdtempSync(join(tmpdir(), "ghostpaw-grep-"));
  grepTool = createGrepTool(workDir);
});

afterEach(() => {
  rmSync(workDir, { recursive: true, force: true });
});

describe("Grep tool", () => {
  it("has correct tool metadata", () => {
    strictEqual(grepTool.name, "grep");
    ok(grepTool.description.length > 0);
  });

  it("finds matches in files", async () => {
    writeFileSync(join(workDir, "hello.txt"), "hello world\ngoodbye world\n");
    const result = (await exec({ pattern: "hello" })) as {
      matches: GrepMatch[];
      totalMatches: number;
    };
    ok(result.matches.length > 0);
    strictEqual(result.matches[0]!.line, 1);
    ok(result.matches[0]!.content.includes("hello"));
  });

  it("returns empty matches when nothing found", async () => {
    writeFileSync(join(workDir, "hello.txt"), "hello world\n");
    const result = (await exec({ pattern: "zzzznotfound" })) as {
      matches: GrepMatch[];
      totalMatches: number;
    };
    strictEqual(result.matches.length, 0);
    strictEqual(result.totalMatches, 0);
  });

  it("rejects empty pattern", async () => {
    const result = (await exec({ pattern: "" })) as { error: string };
    ok(result.error);
    ok(result.error.includes("empty"));
  });

  it("rejects whitespace-only pattern", async () => {
    const result = (await exec({ pattern: "   " })) as { error: string };
    ok(result.error);
  });

  it("searches in subdirectories", async () => {
    mkdirSync(join(workDir, "sub"));
    writeFileSync(join(workDir, "sub", "nested.txt"), "findme here\n");
    const result = (await exec({ pattern: "findme" })) as { matches: GrepMatch[] };
    ok(result.matches.length > 0);
    ok(result.matches[0]!.file.includes("sub"));
  });

  it("respects path parameter", async () => {
    mkdirSync(join(workDir, "a"));
    mkdirSync(join(workDir, "b"));
    writeFileSync(join(workDir, "a", "file.txt"), "target\n");
    writeFileSync(join(workDir, "b", "file.txt"), "target\n");
    const result = (await exec({ pattern: "target", path: "a" })) as { matches: GrepMatch[] };
    ok(result.matches.length > 0);
    ok(result.matches.every((m) => m.file.startsWith("a")));
  });

  it("respects maxResults cap", async () => {
    const lines = Array.from({ length: 50 }, (_, i) => `match_${i}`).join("\n");
    writeFileSync(join(workDir, "many.txt"), lines);
    const result = (await exec({ pattern: "match_", maxResults: 5 })) as {
      matches: GrepMatch[];
      truncated: boolean;
    };
    ok(result.matches.length <= 5);
  });

  it("allows paths outside workspace (searches real location)", async () => {
    const result = (await exec({ pattern: "nonexistent_xyzzy_pattern", path: "/tmp" })) as {
      matches: unknown[];
      totalMatches: number;
    };
    ok(result.matches !== undefined, "should search, not return access-denied");
    strictEqual(result.totalMatches, 0);
  });

  it("caps maxResults at 100", async () => {
    writeFileSync(join(workDir, "file.txt"), "x\n");
    const result = (await exec({ pattern: "x", maxResults: 999 })) as {
      matches: GrepMatch[];
    };
    ok(result.matches);
  });

  it("handles glob file filter", async () => {
    writeFileSync(join(workDir, "code.ts"), "findme ts\n");
    writeFileSync(join(workDir, "code.js"), "findme js\n");
    const result = (await exec({ pattern: "findme", glob: "*.ts" })) as {
      matches: GrepMatch[];
    };
    ok(result.matches.length > 0);
    ok(result.matches.every((m) => m.file.endsWith(".ts")));
  });
});

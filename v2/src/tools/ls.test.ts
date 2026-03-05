import { ok, strictEqual } from "node:assert";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, it } from "node:test";
import type { LsEntry } from "./ls.ts";
import { createLsTool } from "./ls.ts";

let workDir: string;
let lsTool: ReturnType<typeof createLsTool>;

async function exec(args: Record<string, unknown>) {
  return lsTool.execute({ args } as Parameters<typeof lsTool.execute>[0]);
}

beforeEach(() => {
  workDir = mkdtempSync(join(tmpdir(), "ghostpaw-ls-"));
  lsTool = createLsTool(workDir);
});

afterEach(() => {
  rmSync(workDir, { recursive: true, force: true });
});

describe("ls tool", () => {
  it("has correct tool metadata", () => {
    strictEqual(lsTool.name, "ls");
    ok(lsTool.description.length > 0);
  });

  it("lists files in workspace root", async () => {
    writeFileSync(join(workDir, "a.txt"), "hello");
    writeFileSync(join(workDir, "b.txt"), "world");
    const result = (await exec({})) as { entries: LsEntry[]; total: number };
    ok(result.entries.length >= 2);
    ok(result.entries.some((e) => e.name === "a.txt"));
    ok(result.entries.some((e) => e.name === "b.txt"));
  });

  it("classifies files and directories", async () => {
    writeFileSync(join(workDir, "file.txt"), "content");
    mkdirSync(join(workDir, "subdir"));
    const result = (await exec({})) as { entries: LsEntry[] };
    const file = result.entries.find((e) => e.name === "file.txt");
    const dir = result.entries.find((e) => e.name === "subdir");
    ok(file);
    strictEqual(file!.type, "file");
    ok(typeof file!.size === "number");
    ok(dir);
    strictEqual(dir!.type, "dir");
  });

  it("respects depth parameter", async () => {
    mkdirSync(join(workDir, "a", "b", "c"), { recursive: true });
    writeFileSync(join(workDir, "a", "b", "c", "deep.txt"), "deep");
    const shallow = (await exec({ depth: 1 })) as { entries: LsEntry[] };
    const deep = (await exec({ depth: 4 })) as { entries: LsEntry[] };
    ok(deep.entries.length >= shallow.entries.length);
  });

  it("clamps depth to max 5", async () => {
    const result = (await exec({ depth: 100 })) as { entries: LsEntry[] };
    ok(result.entries);
  });

  it("filters by glob pattern", async () => {
    writeFileSync(join(workDir, "code.ts"), "ts");
    writeFileSync(join(workDir, "code.js"), "js");
    writeFileSync(join(workDir, "readme.md"), "md");
    const result = (await exec({ glob: "*.ts" })) as { entries: LsEntry[] };
    ok(result.entries.some((e) => e.name === "code.ts"));
    ok(!result.entries.some((e) => e.name === "code.js"));
    ok(!result.entries.some((e) => e.name === "readme.md"));
  });

  it("handles brace expansion in glob", async () => {
    writeFileSync(join(workDir, "app.ts"), "ts");
    writeFileSync(join(workDir, "app.tsx"), "tsx");
    writeFileSync(join(workDir, "app.js"), "js");
    writeFileSync(join(workDir, "app.css"), "css");
    const result = (await exec({ glob: "*.{ts,tsx}" })) as { entries: LsEntry[] };
    ok(result.entries.some((e) => e.name === "app.ts"));
    ok(result.entries.some((e) => e.name === "app.tsx"));
    ok(!result.entries.some((e) => e.name === "app.js"));
    ok(!result.entries.some((e) => e.name === "app.css"));
  });

  it("skips node_modules", async () => {
    mkdirSync(join(workDir, "node_modules", "pkg"), { recursive: true });
    writeFileSync(join(workDir, "node_modules", "pkg", "index.js"), "x");
    writeFileSync(join(workDir, "app.js"), "y");
    const result = (await exec({})) as { entries: LsEntry[] };
    ok(!result.entries.some((e) => e.name.includes("node_modules")));
    ok(result.entries.some((e) => e.name === "app.js"));
  });

  it("skips .git directory", async () => {
    mkdirSync(join(workDir, ".git", "objects"), { recursive: true });
    writeFileSync(join(workDir, "src.ts"), "code");
    const result = (await exec({})) as { entries: LsEntry[] };
    ok(!result.entries.some((e) => e.name.includes(".git")));
  });

  it("returns error for non-existent path", async () => {
    const result = (await exec({ path: "nope" })) as { error: string };
    ok(result.error);
    ok(result.error.includes("not found"));
  });

  it("returns error for file path", async () => {
    writeFileSync(join(workDir, "file.txt"), "x");
    const result = (await exec({ path: "file.txt" })) as { error: string };
    ok(result.error);
    ok(result.error.includes("not a directory"));
  });

  it("prevents path traversal", async () => {
    const result = (await exec({ path: "../../etc" })) as { error: string };
    ok(result.error);
    ok(result.error.includes("outside") || result.error.includes("denied"));
  });

  it("lists subdirectory contents", async () => {
    mkdirSync(join(workDir, "src"));
    writeFileSync(join(workDir, "src", "index.ts"), "code");
    const result = (await exec({ path: "src" })) as { entries: LsEntry[] };
    ok(result.entries.some((e) => e.name === "index.ts"));
  });

  it("includes file sizes", async () => {
    writeFileSync(join(workDir, "sized.txt"), "hello world");
    const result = (await exec({})) as { entries: LsEntry[] };
    const entry = result.entries.find((e) => e.name === "sized.txt");
    ok(entry);
    strictEqual(entry!.size, 11);
  });
});

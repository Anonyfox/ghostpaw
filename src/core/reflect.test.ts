import { deepStrictEqual, ok, strictEqual } from "node:assert";
import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readdirSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, it } from "node:test";

/**
 * Testing the pure functions: snapshot, diff, report formatting.
 * The full reflect run requires LLM integration — tested manually.
 */

let workDir: string;

beforeEach(() => {
  workDir = mkdtempSync(join(tmpdir(), "ghostpaw-reflect-"));
  mkdirSync(join(workDir, "skills"), { recursive: true });
});

afterEach(() => {
  rmSync(workDir, { recursive: true, force: true });
});

function snapshotSkills(workspacePath: string): Record<string, string> {
  const skillsDir = join(workspacePath, "skills");
  if (!existsSync(skillsDir)) return {};

  const snapshot: Record<string, string> = {};
  for (const file of readdirSync(skillsDir)) {
    if (!file.endsWith(".md")) continue;
    snapshot[file] = readFileSync(join(skillsDir, file), "utf-8");
  }
  return snapshot;
}

function extractTitle(content: string): string {
  const firstLine = content.split("\n").find((l: string) => l.trim().startsWith("#"));
  if (firstLine) return firstLine.replace(/^#+\s*/, "").trim();
  return "(untitled)";
}

interface TrainChange {
  type: "created" | "updated";
  filename: string;
  title: string;
}

function diffSkills(before: Record<string, string>, after: Record<string, string>): TrainChange[] {
  const changes: TrainChange[] = [];
  for (const [filename, content] of Object.entries(after)) {
    if (!(filename in before)) {
      changes.push({ type: "created", filename, title: extractTitle(content) });
    } else if (before[filename] !== content) {
      changes.push({ type: "updated", filename, title: extractTitle(content) });
    }
  }
  return changes;
}

describe("snapshotSkills", () => {
  it("captures all .md files in skills/", () => {
    writeFileSync(join(workDir, "skills", "a.md"), "# Alpha\nContent");
    writeFileSync(join(workDir, "skills", "b.md"), "# Beta\nMore");
    const snap = snapshotSkills(workDir);
    strictEqual(Object.keys(snap).length, 2);
    ok(snap["a.md"].includes("Alpha"));
    ok(snap["b.md"].includes("Beta"));
  });

  it("ignores non-.md files", () => {
    writeFileSync(join(workDir, "skills", "readme.txt"), "ignore me");
    writeFileSync(join(workDir, "skills", "skill.md"), "# Skill");
    const snap = snapshotSkills(workDir);
    strictEqual(Object.keys(snap).length, 1);
    ok("skill.md" in snap);
  });

  it("returns empty object for missing skills/ dir", () => {
    rmSync(join(workDir, "skills"), { recursive: true });
    const snap = snapshotSkills(workDir);
    deepStrictEqual(snap, {});
  });
});

describe("extractTitle", () => {
  it("extracts h1 title", () => {
    strictEqual(extractTitle("# Deploy to Vercel\n\nSteps..."), "Deploy to Vercel");
  });

  it("extracts h2 title when no h1", () => {
    strictEqual(extractTitle("## Sub Heading\nContent"), "Sub Heading");
  });

  it("returns (untitled) for no heading", () => {
    strictEqual(extractTitle("Just some content"), "(untitled)");
  });

  it("handles leading whitespace in heading", () => {
    strictEqual(extractTitle("Some preamble\n# Actual Title\nContent"), "Actual Title");
  });
});

describe("diffSkills", () => {
  it("detects new files", () => {
    const before = {};
    const after = { "deploy.md": "# Deploy\nSteps" };
    const changes = diffSkills(before, after);
    strictEqual(changes.length, 1);
    strictEqual(changes[0].type, "created");
    strictEqual(changes[0].filename, "deploy.md");
    strictEqual(changes[0].title, "Deploy");
  });

  it("detects modified files", () => {
    const before = { "deploy.md": "# Deploy\nOld steps" };
    const after = { "deploy.md": "# Deploy\nNew improved steps" };
    const changes = diffSkills(before, after);
    strictEqual(changes.length, 1);
    strictEqual(changes[0].type, "updated");
    strictEqual(changes[0].title, "Deploy");
  });

  it("ignores unchanged files", () => {
    const content = "# Stable\nNever changes";
    const before = { "stable.md": content };
    const after = { "stable.md": content };
    const changes = diffSkills(before, after);
    strictEqual(changes.length, 0);
  });

  it("handles mix of new, updated, and unchanged", () => {
    const before = {
      "unchanged.md": "# Unchanged\nSame",
      "updated.md": "# Updated\nV1",
    };
    const after = {
      "unchanged.md": "# Unchanged\nSame",
      "updated.md": "# Updated\nV2 with improvements",
      "new.md": "# Brand New\nFresh skill",
    };
    const changes = diffSkills(before, after);
    strictEqual(changes.length, 2);
    ok(changes.some((c) => c.type === "created" && c.filename === "new.md"));
    ok(changes.some((c) => c.type === "updated" && c.filename === "updated.md"));
  });

  it("returns empty array when nothing changed", () => {
    const before = { "a.md": "# A\n", "b.md": "# B\n" };
    const after = { "a.md": "# A\n", "b.md": "# B\n" };
    deepStrictEqual(diffSkills(before, after), []);
  });
});

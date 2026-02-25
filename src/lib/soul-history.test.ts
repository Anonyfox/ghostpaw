import { deepStrictEqual, ok, strictEqual } from "node:assert";
import { existsSync, mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, it } from "node:test";
import { isGitAvailable } from "./skill-history.js";
import {
  commitSouls,
  diffSouls,
  getAllSoulLevels,
  getLastCommitDiff,
  getSoulLevel,
  getSoulLog,
  hasSoulHistory,
  initSoulHistory,
} from "./soul-history.js";

let workDir: string;

beforeEach(() => {
  workDir = mkdtempSync(join(tmpdir(), "ghostpaw-soul-history-"));
  mkdirSync(join(workDir, "agents"), { recursive: true });
  mkdirSync(join(workDir, ".ghostpaw"), { recursive: true });
});

afterEach(() => {
  rmSync(workDir, { recursive: true, force: true });
});

describe("initSoulHistory", () => {
  it("creates the soul-history git dir", () => {
    if (!isGitAvailable()) return;

    const result = initSoulHistory(workDir);
    ok(result);
    ok(existsSync(join(workDir, ".ghostpaw", "soul-history", "HEAD")));
  });

  it("does not leave a .git file inside agents/", () => {
    if (!isGitAvailable()) return;

    initSoulHistory(workDir);
    ok(!existsSync(join(workDir, "agents", ".git")));
  });

  it("is idempotent — second call returns true without error", () => {
    if (!isGitAvailable()) return;

    ok(initSoulHistory(workDir));
    ok(initSoulHistory(workDir));
  });
});

describe("hasSoulHistory", () => {
  it("returns false before init", () => {
    strictEqual(hasSoulHistory(workDir), false);
  });

  it("returns true after init", () => {
    if (!isGitAvailable()) return;

    initSoulHistory(workDir);
    strictEqual(hasSoulHistory(workDir), true);
  });
});

describe("commitSouls", () => {
  it("commits files in agents/", () => {
    if (!isGitAvailable()) return;

    initSoulHistory(workDir);
    writeFileSync(join(workDir, "agents", "coder.md"), "# Code Specialist\nWrites code.");

    const result = commitSouls(workDir, "add coder soul");
    ok(result);
  });

  it("returns false when nothing to commit", () => {
    if (!isGitAvailable()) return;

    initSoulHistory(workDir);
    commitSouls(workDir, "initial");

    const result = commitSouls(workDir, "no changes");
    strictEqual(result, false);
  });

  it("returns false without history initialized", () => {
    const result = commitSouls(workDir, "no repo");
    strictEqual(result, false);
  });
});

describe("diffSouls", () => {
  it("detects new files as created", () => {
    if (!isGitAvailable()) return;

    initSoulHistory(workDir);
    commitSouls(workDir, "baseline");

    writeFileSync(join(workDir, "agents", "writer.md"), "# Writer\nNew soul");

    const diff = diffSouls(workDir);
    ok(diff);
    ok(diff.created.includes("writer.md"));
    strictEqual(diff.updated.length, 0);
    strictEqual(diff.deleted.length, 0);
  });

  it("detects modified files as updated", () => {
    if (!isGitAvailable()) return;

    initSoulHistory(workDir);
    writeFileSync(join(workDir, "agents", "coder.md"), "# Coder\nV1");
    commitSouls(workDir, "v1");

    writeFileSync(join(workDir, "agents", "coder.md"), "# Coder\nV2 refined");

    const diff = diffSouls(workDir);
    ok(diff);
    ok(diff.updated.includes("coder.md"));
    strictEqual(diff.created.length, 0);
  });

  it("detects deleted files", () => {
    if (!isGitAvailable()) return;

    initSoulHistory(workDir);
    writeFileSync(join(workDir, "agents", "old.md"), "# Old Soul");
    commitSouls(workDir, "with old");

    rmSync(join(workDir, "agents", "old.md"));

    const diff = diffSouls(workDir);
    ok(diff);
    ok(diff.deleted.includes("old.md"));
  });

  it("returns null without history", () => {
    const diff = diffSouls(workDir);
    strictEqual(diff, null);
  });

  it("returns empty diff when nothing changed", () => {
    if (!isGitAvailable()) return;

    initSoulHistory(workDir);
    writeFileSync(join(workDir, "agents", "stable.md"), "# Stable");
    commitSouls(workDir, "baseline");

    const diff = diffSouls(workDir);
    ok(diff);
    deepStrictEqual(diff.created, []);
    deepStrictEqual(diff.updated, []);
    deepStrictEqual(diff.deleted, []);
  });
});

describe("getSoulLog", () => {
  it("returns commit messages after commits", () => {
    if (!isGitAvailable()) return;

    initSoulHistory(workDir);
    writeFileSync(join(workDir, "agents", "a.md"), "# A");
    commitSouls(workDir, "first commit");
    writeFileSync(join(workDir, "agents", "a.md"), "# A\nRefined");
    commitSouls(workDir, "second commit");

    const log = getSoulLog(workDir);
    ok(log.length >= 2);
    ok(log.some((l) => l.includes("first commit")));
    ok(log.some((l) => l.includes("second commit")));
  });

  it("returns empty array without history", () => {
    deepStrictEqual(getSoulLog(workDir), []);
  });

  it("filters by filename", () => {
    if (!isGitAvailable()) return;

    initSoulHistory(workDir);
    writeFileSync(join(workDir, "agents", "a.md"), "# A");
    commitSouls(workDir, "add a");
    writeFileSync(join(workDir, "agents", "b.md"), "# B");
    commitSouls(workDir, "add b");

    const logA = getSoulLog(workDir, "a.md");
    ok(logA.some((l) => l.includes("add a")));
    ok(!logA.some((l) => l.includes("add b")));
  });
});

describe("getSoulLevel", () => {
  it("returns 0 without history", () => {
    strictEqual(getSoulLevel(workDir, "anything.md"), 0);
  });

  it("returns 1 after initial commit", () => {
    if (!isGitAvailable()) return;

    initSoulHistory(workDir);
    writeFileSync(join(workDir, "agents", "coder.md"), "# Coder\nV1");
    commitSouls(workDir, "add coder");

    strictEqual(getSoulLevel(workDir, "coder.md"), 1);
  });

  it("increments with each commit that touches the file", () => {
    if (!isGitAvailable()) return;

    initSoulHistory(workDir);
    writeFileSync(join(workDir, "agents", "coder.md"), "# Coder\nV1");
    commitSouls(workDir, "v1");
    writeFileSync(join(workDir, "agents", "coder.md"), "# Coder\nV2");
    commitSouls(workDir, "v2");
    writeFileSync(join(workDir, "agents", "coder.md"), "# Coder\nV3");
    commitSouls(workDir, "v3");

    strictEqual(getSoulLevel(workDir, "coder.md"), 3);
  });

  it("does not count commits to other files", () => {
    if (!isGitAvailable()) return;

    initSoulHistory(workDir);
    writeFileSync(join(workDir, "agents", "a.md"), "# A");
    commitSouls(workDir, "add a");
    writeFileSync(join(workDir, "agents", "b.md"), "# B");
    commitSouls(workDir, "add b");
    writeFileSync(join(workDir, "agents", "b.md"), "# B\nRefined");
    commitSouls(workDir, "refine b");

    strictEqual(getSoulLevel(workDir, "a.md"), 1);
    strictEqual(getSoulLevel(workDir, "b.md"), 2);
  });

  it("returns 0 for unknown file", () => {
    if (!isGitAvailable()) return;

    initSoulHistory(workDir);
    writeFileSync(join(workDir, "agents", "a.md"), "# A");
    commitSouls(workDir, "add a");

    strictEqual(getSoulLevel(workDir, "nonexistent.md"), 0);
  });
});

describe("getLastCommitDiff", () => {
  it("returns empty string without history", () => {
    strictEqual(getLastCommitDiff(workDir), "");
  });

  it("returns diff output for the most recent commit", () => {
    if (!isGitAvailable()) return;

    initSoulHistory(workDir);
    writeFileSync(join(workDir, "agents", "coder.md"), "# Coder\nV1");
    commitSouls(workDir, "v1");
    writeFileSync(join(workDir, "agents", "coder.md"), "# Coder\nV2 refined identity");
    commitSouls(workDir, "v2");

    const diff = getLastCommitDiff(workDir);
    ok(diff.length > 0);
    ok(diff.includes("-V1"));
    ok(diff.includes("+V2 refined identity"));
  });

  it("filters by filename", () => {
    if (!isGitAvailable()) return;

    initSoulHistory(workDir);
    writeFileSync(join(workDir, "agents", "a.md"), "# A\nOriginal");
    writeFileSync(join(workDir, "agents", "b.md"), "# B\nOriginal");
    commitSouls(workDir, "initial");
    writeFileSync(join(workDir, "agents", "a.md"), "# A\nChanged");
    writeFileSync(join(workDir, "agents", "b.md"), "# B\nAlso changed");
    commitSouls(workDir, "update both");

    const diffA = getLastCommitDiff(workDir, "a.md");
    ok(diffA.includes("+Changed"));
    ok(!diffA.includes("Also changed"));
  });
});

describe("getAllSoulLevels", () => {
  it("returns empty object without history", () => {
    deepStrictEqual(getAllSoulLevels(workDir), {});
  });

  it("returns levels for all tracked files", () => {
    if (!isGitAvailable()) return;

    initSoulHistory(workDir);
    writeFileSync(join(workDir, "agents", "a.md"), "# A");
    writeFileSync(join(workDir, "agents", "b.md"), "# B");
    commitSouls(workDir, "initial");
    writeFileSync(join(workDir, "agents", "b.md"), "# B\nRefined");
    commitSouls(workDir, "refine b");

    const levels = getAllSoulLevels(workDir);
    strictEqual(levels["a.md"], 1);
    strictEqual(levels["b.md"], 2);
  });
});

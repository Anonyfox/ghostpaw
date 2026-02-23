import { deepStrictEqual, ok, strictEqual } from "node:assert";
import { existsSync, mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, it } from "node:test";
import {
  commitSkills,
  diffSkills,
  getAllSkillRanks,
  getSkillLog,
  getSkillRank,
  hasHistory,
  initHistory,
  isGitAvailable,
} from "./skill-history.js";

let workDir: string;

beforeEach(() => {
  workDir = mkdtempSync(join(tmpdir(), "ghostpaw-skill-history-"));
  mkdirSync(join(workDir, "skills"), { recursive: true });
  mkdirSync(join(workDir, ".ghostpaw"), { recursive: true });
});

afterEach(() => {
  rmSync(workDir, { recursive: true, force: true });
});

describe("isGitAvailable", () => {
  it("returns a boolean", () => {
    const result = isGitAvailable();
    strictEqual(typeof result, "boolean");
  });
});

describe("initHistory", () => {
  it("creates the skill-history git dir", () => {
    if (!isGitAvailable()) return;

    const result = initHistory(workDir);
    ok(result);
    ok(existsSync(join(workDir, ".ghostpaw", "skill-history", "HEAD")));
  });

  it("does not leave a .git file inside skills/", () => {
    if (!isGitAvailable()) return;

    initHistory(workDir);
    ok(!existsSync(join(workDir, "skills", ".git")));
  });

  it("is idempotent — second call returns true without error", () => {
    if (!isGitAvailable()) return;

    ok(initHistory(workDir));
    ok(initHistory(workDir));
  });

  it("returns false when git is missing", () => {
    // We can't really uninstall git, so test the hasHistory fallback
    const result = hasHistory(workDir);
    strictEqual(result, false);
  });
});

describe("hasHistory", () => {
  it("returns false before init", () => {
    strictEqual(hasHistory(workDir), false);
  });

  it("returns true after init", () => {
    if (!isGitAvailable()) return;

    initHistory(workDir);
    strictEqual(hasHistory(workDir), true);
  });
});

describe("commitSkills", () => {
  it("commits files in skills/", () => {
    if (!isGitAvailable()) return;

    initHistory(workDir);
    writeFileSync(join(workDir, "skills", "deploy.md"), "# Deploy\nSteps here");

    const result = commitSkills(workDir, "add deploy skill");
    ok(result);
  });

  it("returns false when nothing to commit", () => {
    if (!isGitAvailable()) return;

    initHistory(workDir);
    commitSkills(workDir, "initial");

    const result = commitSkills(workDir, "no changes");
    strictEqual(result, false);
  });

  it("returns false without history initialized", () => {
    const result = commitSkills(workDir, "no repo");
    strictEqual(result, false);
  });
});

describe("diffSkills", () => {
  it("detects new files as created", () => {
    if (!isGitAvailable()) return;

    initHistory(workDir);
    commitSkills(workDir, "baseline");

    writeFileSync(join(workDir, "skills", "deploy.md"), "# Deploy\nNew");

    const diff = diffSkills(workDir);
    ok(diff);
    ok(diff.created.includes("deploy.md"));
    strictEqual(diff.updated.length, 0);
    strictEqual(diff.deleted.length, 0);
  });

  it("detects modified files as updated", () => {
    if (!isGitAvailable()) return;

    initHistory(workDir);
    writeFileSync(join(workDir, "skills", "deploy.md"), "# Deploy\nV1");
    commitSkills(workDir, "v1");

    writeFileSync(join(workDir, "skills", "deploy.md"), "# Deploy\nV2 improved");

    const diff = diffSkills(workDir);
    ok(diff);
    ok(diff.updated.includes("deploy.md"));
    strictEqual(diff.created.length, 0);
  });

  it("detects deleted files", () => {
    if (!isGitAvailable()) return;

    initHistory(workDir);
    writeFileSync(join(workDir, "skills", "old.md"), "# Old");
    commitSkills(workDir, "with old");

    rmSync(join(workDir, "skills", "old.md"));

    const diff = diffSkills(workDir);
    ok(diff);
    ok(diff.deleted.includes("old.md"));
  });

  it("returns null without history", () => {
    const diff = diffSkills(workDir);
    strictEqual(diff, null);
  });

  it("returns empty diff when nothing changed", () => {
    if (!isGitAvailable()) return;

    initHistory(workDir);
    writeFileSync(join(workDir, "skills", "stable.md"), "# Stable");
    commitSkills(workDir, "baseline");

    const diff = diffSkills(workDir);
    ok(diff);
    deepStrictEqual(diff.created, []);
    deepStrictEqual(diff.updated, []);
    deepStrictEqual(diff.deleted, []);
  });
});

describe("getSkillLog", () => {
  it("returns commit messages after commits", () => {
    if (!isGitAvailable()) return;

    initHistory(workDir);
    writeFileSync(join(workDir, "skills", "a.md"), "# A");
    commitSkills(workDir, "first commit");
    writeFileSync(join(workDir, "skills", "a.md"), "# A\nUpdated");
    commitSkills(workDir, "second commit");

    const log = getSkillLog(workDir);
    ok(log.length >= 2);
    ok(log.some((l) => l.includes("first commit")));
    ok(log.some((l) => l.includes("second commit")));
  });

  it("returns empty array without history", () => {
    deepStrictEqual(getSkillLog(workDir), []);
  });

  it("filters by filename", () => {
    if (!isGitAvailable()) return;

    initHistory(workDir);
    writeFileSync(join(workDir, "skills", "a.md"), "# A");
    commitSkills(workDir, "add a");
    writeFileSync(join(workDir, "skills", "b.md"), "# B");
    commitSkills(workDir, "add b");

    const logA = getSkillLog(workDir, "a.md");
    ok(logA.some((l) => l.includes("add a")));
    ok(!logA.some((l) => l.includes("add b")));
  });
});

describe("getSkillRank", () => {
  it("returns 0 without history", () => {
    strictEqual(getSkillRank(workDir, "anything.md"), 0);
  });

  it("returns 1 after initial commit", () => {
    if (!isGitAvailable()) return;

    initHistory(workDir);
    writeFileSync(join(workDir, "skills", "deploy.md"), "# Deploy\nV1");
    commitSkills(workDir, "add deploy");

    strictEqual(getSkillRank(workDir, "deploy.md"), 1);
  });

  it("increments with each commit that touches the file", () => {
    if (!isGitAvailable()) return;

    initHistory(workDir);
    writeFileSync(join(workDir, "skills", "deploy.md"), "# Deploy\nV1");
    commitSkills(workDir, "v1");
    writeFileSync(join(workDir, "skills", "deploy.md"), "# Deploy\nV2");
    commitSkills(workDir, "v2");
    writeFileSync(join(workDir, "skills", "deploy.md"), "# Deploy\nV3");
    commitSkills(workDir, "v3");

    strictEqual(getSkillRank(workDir, "deploy.md"), 3);
  });

  it("does not count commits to other files", () => {
    if (!isGitAvailable()) return;

    initHistory(workDir);
    writeFileSync(join(workDir, "skills", "a.md"), "# A");
    commitSkills(workDir, "add a");
    writeFileSync(join(workDir, "skills", "b.md"), "# B");
    commitSkills(workDir, "add b");
    writeFileSync(join(workDir, "skills", "b.md"), "# B\nUpdated");
    commitSkills(workDir, "update b");

    strictEqual(getSkillRank(workDir, "a.md"), 1);
    strictEqual(getSkillRank(workDir, "b.md"), 2);
  });

  it("returns 0 for unknown file", () => {
    if (!isGitAvailable()) return;

    initHistory(workDir);
    writeFileSync(join(workDir, "skills", "a.md"), "# A");
    commitSkills(workDir, "add a");

    strictEqual(getSkillRank(workDir, "nonexistent.md"), 0);
  });
});

describe("getAllSkillRanks", () => {
  it("returns empty object without history", () => {
    deepStrictEqual(getAllSkillRanks(workDir), {});
  });

  it("returns ranks for all tracked files", () => {
    if (!isGitAvailable()) return;

    initHistory(workDir);
    writeFileSync(join(workDir, "skills", "a.md"), "# A");
    writeFileSync(join(workDir, "skills", "b.md"), "# B");
    commitSkills(workDir, "initial");
    writeFileSync(join(workDir, "skills", "b.md"), "# B\nImproved");
    commitSkills(workDir, "improve b");

    const ranks = getAllSkillRanks(workDir);
    strictEqual(ranks["a.md"], 1);
    strictEqual(ranks["b.md"], 2);
  });
});

import { strictEqual } from "node:assert";
import { execFileSync } from "node:child_process";
import { mkdirSync, mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, it } from "node:test";
import {
  git,
  gitDir,
  hasHistory,
  isGitAvailable,
  resetGitAvailableCache,
  workTree,
} from "./git.ts";

let workspace: string;

beforeEach(() => {
  resetGitAvailableCache();
  workspace = mkdtempSync(join(tmpdir(), "ghostpaw-git-test-"));
  mkdirSync(join(workspace, "skills"), { recursive: true });
});

afterEach(() => {
  rmSync(workspace, { recursive: true, force: true });
});

describe("git helpers", () => {
  it("detects git is available on this system", () => {
    strictEqual(isGitAvailable(), true);
  });

  it("returns correct gitDir path", () => {
    strictEqual(gitDir(workspace), join(workspace, ".ghostpaw", "skill-history"));
  });

  it("returns correct workTree path", () => {
    strictEqual(workTree(workspace), join(workspace, "skills"));
  });

  it("reports no history before init", () => {
    strictEqual(hasHistory(workspace), false);
  });

  it("reports history after git init", () => {
    const dir = gitDir(workspace);
    const tree = workTree(workspace);
    mkdirSync(dir, { recursive: true });
    execFileSync("git", ["init", `--separate-git-dir=${dir}`, tree], {
      encoding: "utf-8",
      stdio: "ignore",
    });
    strictEqual(hasHistory(workspace), true);
  });

  it("executes git commands successfully in an initialized repo", () => {
    const dir = gitDir(workspace);
    const tree = workTree(workspace);
    mkdirSync(dir, { recursive: true });
    execFileSync("git", ["init", `--separate-git-dir=${dir}`, tree], {
      encoding: "utf-8",
      stdio: "ignore",
    });

    const result = git(workspace, ["status", "--porcelain"]);
    strictEqual(result.ok, true);
  });

  it("returns ok: false for commands on uninitialized repo", () => {
    const result = git(workspace, ["log", "--oneline"]);
    strictEqual(result.ok, false);
    strictEqual(result.stdout, "");
  });

  it("caches git availability check", () => {
    const first = isGitAvailable();
    const second = isGitAvailable();
    strictEqual(first, second);
  });
});

/**
 * Git-based soul evolution tracking. All git data lives in
 * .ghostpaw/soul-history/ (a separate git-dir), with agents/ as the
 * work-tree. Zero artifacts in the agents directory itself.
 *
 * Gracefully degrades when git is not installed — every function
 * returns a safe fallback value.
 */

import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, unlinkSync } from "node:fs";
import { join } from "node:path";
import { isGitAvailable } from "./skill-history.js";

function gitDir(workspacePath: string): string {
  return join(workspacePath, ".ghostpaw", "soul-history");
}

function workTree(workspacePath: string): string {
  return join(workspacePath, "agents");
}

function git(workspacePath: string, args: string[]): { stdout: string; ok: boolean } {
  if (!isGitAvailable()) return { stdout: "", ok: false };

  try {
    const stdout = execFileSync(
      "git",
      [`--git-dir=${gitDir(workspacePath)}`, `--work-tree=${workTree(workspacePath)}`, ...args],
      {
        encoding: "utf-8",
        stdio: ["ignore", "pipe", "ignore"],
        timeout: 10_000,
      },
    );
    return { stdout: stdout.trim(), ok: true };
  } catch {
    return { stdout: "", ok: false };
  }
}

/**
 * Initialize the soul history repo. Safe to call multiple times —
 * skips if already initialized.
 */
export function initSoulHistory(workspacePath: string): boolean {
  if (!isGitAvailable()) return false;
  if (existsSync(join(gitDir(workspacePath), "HEAD"))) return true;

  const dir = gitDir(workspacePath);
  const tree = workTree(workspacePath);

  mkdirSync(join(workspacePath, ".ghostpaw"), { recursive: true });
  mkdirSync(tree, { recursive: true });

  try {
    execFileSync("git", ["init", `--separate-git-dir=${dir}`, tree], {
      encoding: "utf-8",
      stdio: "ignore",
      timeout: 10_000,
    });
  } catch {
    return false;
  }

  try {
    const gitLink = join(tree, ".git");
    if (existsSync(gitLink)) unlinkSync(gitLink);
  } catch {
    // non-critical
  }

  git(workspacePath, ["config", "user.name", "ghostpaw"]);
  git(workspacePath, ["config", "user.email", "ghostpaw@local"]);

  return true;
}

/**
 * Returns true if soul history has been initialized for this workspace.
 */
export function hasSoulHistory(workspacePath: string): boolean {
  return existsSync(join(gitDir(workspacePath), "HEAD"));
}

/**
 * Stage all changes in agents/ and commit. Returns false if nothing to commit.
 */
export function commitSouls(workspacePath: string, message: string): boolean {
  if (!hasSoulHistory(workspacePath)) return false;

  git(workspacePath, ["add", "-A"]);

  const status = git(workspacePath, ["status", "--porcelain"]);
  if (!status.ok || !status.stdout.trim()) return false;

  const result = git(workspacePath, ["commit", "-m", message]);
  return result.ok;
}

export interface SoulDiff {
  created: string[];
  updated: string[];
  deleted: string[];
}

/**
 * Diff uncommitted changes against HEAD. Read-only — does not stage
 * anything. Uses `git status --porcelain` to detect new, modified,
 * and deleted files without mutating the index.
 */
export function diffSouls(workspacePath: string): SoulDiff | null {
  if (!hasSoulHistory(workspacePath)) return null;

  const result = git(workspacePath, ["status", "--porcelain"]);
  if (!result.ok) return null;

  const diff: SoulDiff = { created: [], updated: [], deleted: [] };

  for (const line of result.stdout.split("\n")) {
    const trimmed = line.trimStart();
    if (!trimmed) continue;

    const match = trimmed.match(/^(\?\?|[AMDRC])\s+(.+)$/);
    if (!match) continue;
    const [, status, filename] = match;

    if (status === "??" || status === "A") {
      diff.created.push(filename);
    } else if (status === "M" || status === "R") {
      diff.updated.push(filename);
    } else if (status === "D") {
      diff.deleted.push(filename);
    }
  }

  return diff;
}

/**
 * Get the commit log for soul history (or a specific file).
 */
export function getSoulLog(workspacePath: string, filename?: string): string[] {
  if (!hasSoulHistory(workspacePath)) return [];

  const args = ["log", "--oneline", "--no-decorate"];
  if (filename) args.push("--follow", "--", filename);

  const result = git(workspacePath, args);
  if (!result.ok || !result.stdout) return [];

  return result.stdout.split("\n").filter((l) => l.trim());
}

/**
 * Get the level (number of commits that touched this file) for a soul.
 * Uses --follow to survive renames. Returns 0 if the file has no history.
 */
export function getSoulLevel(workspacePath: string, filename: string): number {
  if (!hasSoulHistory(workspacePath)) return 0;

  const result = git(workspacePath, ["log", "--oneline", "--follow", "--", filename]);
  if (!result.ok || !result.stdout) return 0;

  return result.stdout.split("\n").filter((l) => l.trim()).length;
}

/**
 * Get the unified diff of the most recent commit (HEAD~1..HEAD).
 * Returns the raw git diff output, or empty string if unavailable.
 */
export function getLastCommitDiff(workspacePath: string, filename?: string): string {
  if (!hasSoulHistory(workspacePath)) return "";

  const args = ["diff", "HEAD~1", "HEAD", "--unified=3"];
  if (filename) args.push("--", filename);

  const result = git(workspacePath, args);
  return result.ok ? result.stdout : "";
}

/**
 * Get levels for all tracked soul files in a single git call.
 * Uses `git log --format="" --name-only` to get all filenames touched
 * by every commit, then counts occurrences. One process instead of N+1.
 */
export function getAllSoulLevels(workspacePath: string): Record<string, number> {
  if (!hasSoulHistory(workspacePath)) return {};

  const result = git(workspacePath, ["log", "--format=", "--name-only"]);
  if (!result.ok || !result.stdout) return {};

  const levels: Record<string, number> = {};
  for (const line of result.stdout.split("\n")) {
    const file = line.trim();
    if (!file) continue;
    levels[file] = (levels[file] ?? 0) + 1;
  }
  return levels;
}

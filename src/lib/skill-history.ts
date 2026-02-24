/**
 * Git-based skill evolution tracking. All git data lives in
 * .ghostpaw/skill-history/ (a separate git-dir), with skills/ as the
 * work-tree. Zero artifacts in the skills directory itself.
 *
 * Gracefully degrades when git is not installed — every function
 * returns a safe fallback value.
 */

import { execFileSync } from "node:child_process";
import { existsSync, unlinkSync } from "node:fs";
import { join } from "node:path";

let gitAvailable: boolean | null = null;

export function isGitAvailable(): boolean {
  if (gitAvailable !== null) return gitAvailable;
  try {
    execFileSync("git", ["--version"], { stdio: "ignore" });
    gitAvailable = true;
  } catch {
    gitAvailable = false;
  }
  return gitAvailable;
}

function gitDir(workspacePath: string): string {
  return join(workspacePath, ".ghostpaw", "skill-history");
}

function workTree(workspacePath: string): string {
  return join(workspacePath, "skills");
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
 * Initialize the skill history repo. Safe to call multiple times —
 * skips if already initialized.
 */
export function initHistory(workspacePath: string): boolean {
  if (!isGitAvailable()) return false;
  if (existsSync(join(gitDir(workspacePath), "HEAD"))) return true;

  const dir = gitDir(workspacePath);
  const tree = workTree(workspacePath);

  try {
    execFileSync("git", ["init", `--separate-git-dir=${dir}`, tree], {
      encoding: "utf-8",
      stdio: "ignore",
      timeout: 10_000,
    });
  } catch {
    return false;
  }

  // Remove the .git file that --separate-git-dir creates inside skills/
  try {
    const gitLink = join(tree, ".git");
    if (existsSync(gitLink)) unlinkSync(gitLink);
  } catch {
    // non-critical
  }

  // Configure local git identity for commits
  git(workspacePath, ["config", "user.name", "ghostpaw"]);
  git(workspacePath, ["config", "user.email", "ghostpaw@local"]);

  return true;
}

/**
 * Returns true if skill history has been initialized for this workspace.
 */
export function hasHistory(workspacePath: string): boolean {
  return existsSync(join(gitDir(workspacePath), "HEAD"));
}

/**
 * Stage all changes in skills/ and commit. Returns false if nothing to commit.
 */
export function commitSkills(workspacePath: string, message: string): boolean {
  if (!hasHistory(workspacePath)) return false;

  git(workspacePath, ["add", "-A"]);

  const status = git(workspacePath, ["status", "--porcelain"]);
  if (!status.ok || !status.stdout.trim()) return false;

  const result = git(workspacePath, ["commit", "-m", message]);
  return result.ok;
}

export interface SkillDiff {
  created: string[];
  updated: string[];
  deleted: string[];
}

/**
 * Diff uncommitted changes against HEAD. Read-only — does not stage
 * anything. Uses `git status --porcelain` to detect new, modified,
 * and deleted files without mutating the index.
 */
export function diffSkills(workspacePath: string): SkillDiff | null {
  if (!hasHistory(workspacePath)) return null;

  const result = git(workspacePath, ["status", "--porcelain"]);
  if (!result.ok) return null;

  const diff: SkillDiff = { created: [], updated: [], deleted: [] };

  for (const line of result.stdout.split("\n")) {
    const trimmed = line.trimStart();
    if (!trimmed) continue;

    // Porcelain v1 format after trimming leading spaces: "X filename" or "?? filename"
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
 * Get the commit log for skill history (or a specific file).
 */
export function getSkillLog(workspacePath: string, filename?: string): string[] {
  if (!hasHistory(workspacePath)) return [];

  const args = ["log", "--oneline", "--no-decorate"];
  if (filename) args.push("--follow", "--", filename);

  const result = git(workspacePath, args);
  if (!result.ok || !result.stdout) return [];

  return result.stdout.split("\n").filter((l) => l.trim());
}

/**
 * Get the rank (number of commits that touched this file) for a skill.
 * Uses --follow to survive renames. Returns 0 if the file has no history.
 */
export function getSkillRank(workspacePath: string, filename: string): number {
  if (!hasHistory(workspacePath)) return 0;

  const result = git(workspacePath, ["log", "--oneline", "--follow", "--", filename]);
  if (!result.ok || !result.stdout) return 0;

  return result.stdout.split("\n").filter((l) => l.trim()).length;
}

/**
 * Get ranks for all tracked skill files in a single call.
 */
export function getAllSkillRanks(workspacePath: string): Record<string, number> {
  if (!hasHistory(workspacePath)) return {};

  const result = git(workspacePath, ["ls-files"]);
  if (!result.ok || !result.stdout) return {};

  const ranks: Record<string, number> = {};
  for (const file of result.stdout.split("\n").filter((l) => l.trim())) {
    ranks[file] = getSkillRank(workspacePath, file);
  }
  return ranks;
}

/**
 * Get the git-dir / work-tree flags for external use (e.g. by the agent
 * running git commands via bash).
 */
export function getGitFlags(workspacePath: string): string {
  return `--git-dir=${gitDir(workspacePath)} --work-tree=${workTree(workspacePath)}`;
}

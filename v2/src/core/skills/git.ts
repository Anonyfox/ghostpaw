import { execFileSync } from "node:child_process";
import { existsSync } from "node:fs";
import { join } from "node:path";
import type { GitResult } from "./types.ts";

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

export function resetGitAvailableCache(): void {
  gitAvailable = null;
}

export function gitDir(workspace: string): string {
  return join(workspace, ".ghostpaw", "skill-history");
}

export function workTree(workspace: string): string {
  return join(workspace, "skills");
}

export function hasHistory(workspace: string): boolean {
  return existsSync(join(gitDir(workspace), "HEAD"));
}

export function git(workspace: string, args: string[]): GitResult {
  if (!isGitAvailable()) return { stdout: "", ok: false };

  try {
    const stdout = execFileSync(
      "git",
      [`--git-dir=${gitDir(workspace)}`, `--work-tree=${workTree(workspace)}`, ...args],
      {
        encoding: "utf-8",
        stdio: ["ignore", "pipe", "ignore"],
        timeout: 10_000,
      },
    );
    return { stdout: stdout.trimEnd(), ok: true };
  } catch {
    return { stdout: "", ok: false };
  }
}

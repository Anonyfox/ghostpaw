import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, unlinkSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { git, gitDir, hasHistory, isGitAvailable, workTree } from "./git.ts";

const EXCLUDE_PATTERNS = [".DS_Store", "__pycache__", "*.pyc", "node_modules", ".env", "*.swp"];

export function initHistory(workspace: string): boolean {
  if (!isGitAvailable()) return false;
  if (hasHistory(workspace)) return true;

  const dir = gitDir(workspace);
  const tree = workTree(workspace);

  mkdirSync(dirname(dir), { recursive: true });

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

  git(workspace, ["config", "user.name", "ghostpaw"]);
  git(workspace, ["config", "user.email", "ghostpaw@local"]);

  try {
    const infoDir = join(dir, "info");
    mkdirSync(infoDir, { recursive: true });
    writeFileSync(join(infoDir, "exclude"), `${EXCLUDE_PATTERNS.join("\n")}\n`, "utf-8");
  } catch {
    // non-critical
  }

  return true;
}

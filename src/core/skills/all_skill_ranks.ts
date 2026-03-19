import { git, hasHistory } from "./git.ts";

const COMMIT_BOUNDARY = "GHOSTPAW_COMMIT";

export function allSkillRanks(workspace: string): Record<string, number> {
  if (!hasHistory(workspace)) return {};

  const result = git(workspace, ["log", `--pretty=format:${COMMIT_BOUNDARY}`, "--name-only"]);
  if (!result.ok || !result.stdout) return {};

  const ranks: Record<string, number> = {};
  let currentCommitDirs = new Set<string>();

  for (const line of result.stdout.split("\n")) {
    if (line === COMMIT_BOUNDARY) {
      for (const dir of currentCommitDirs) {
        ranks[dir] = (ranks[dir] ?? 0) + 1;
      }
      currentCommitDirs = new Set();
      continue;
    }

    const trimmed = line.trim();
    if (!trimmed) continue;

    const slash = trimmed.indexOf("/");
    if (slash > 0) {
      currentCommitDirs.add(trimmed.slice(0, slash));
    }
  }

  for (const dir of currentCommitDirs) {
    ranks[dir] = (ranks[dir] ?? 0) + 1;
  }

  return ranks;
}

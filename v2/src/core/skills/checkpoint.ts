import { existsSync } from "node:fs";
import { join } from "node:path";
import type { DatabaseHandle } from "../../lib/index.ts";
import { logSkillEvent } from "./api/write/events.ts";
import { git, hasHistory, workTree } from "./git.ts";
import { initHistory } from "./init_history.ts";
import { assertSafeSkillName } from "./safe_name.ts";
import type { CheckpointResult } from "./types.ts";

export function checkpoint(
  workspace: string,
  skills: string[],
  message: string,
  db?: DatabaseHandle,
): CheckpointResult {
  if (skills.length === 0) {
    return { committed: false, skills: [], message };
  }

  const tree = workTree(workspace);
  for (const name of skills) {
    assertSafeSkillName(name);
    const skillDir = join(tree, name);
    if (!existsSync(skillDir)) {
      throw new Error(
        `Cannot checkpoint skill "${name}": directory skills/${name}/ does not exist.`,
      );
    }
  }

  if (!hasHistory(workspace)) {
    if (!initHistory(workspace)) {
      return { committed: false, skills: [], message };
    }
  }

  for (const name of skills) {
    git(workspace, ["add", "--", `${name}/`]);
  }

  const status = git(workspace, ["status", "--porcelain"]);
  if (!status.ok || !status.stdout.trim()) {
    return { committed: false, skills: [], message };
  }

  const committedSkills = resolveCommittedSkills(status.stdout, skills);
  if (committedSkills.length === 0) {
    return { committed: false, skills: [], message };
  }

  const result = git(workspace, ["commit", "-m", message]);
  if (!result.ok) {
    return { committed: false, skills: [], message };
  }

  if (db) {
    for (const name of committedSkills) {
      logSkillEvent(db, name, "checkpoint");
    }
  }

  const hashResult = git(workspace, ["rev-parse", "--short", "HEAD"]);
  const commitHash = hashResult.ok ? hashResult.stdout.trim() : undefined;

  return { committed: true, skills: committedSkills, message, commitHash };
}

function resolveCommittedSkills(porcelain: string, requested: string[]): string[] {
  const changed = new Set<string>();
  for (const line of porcelain.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    const filePath = trimmed.slice(2).trim().replace(/^"/, "").replace(/"$/, "");
    const slash = filePath.indexOf("/");
    if (slash > 0) {
      changed.add(filePath.slice(0, slash));
    }
  }
  return requested.filter((s) => changed.has(s));
}

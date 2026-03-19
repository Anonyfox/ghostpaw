import { git, hasHistory } from "./git.ts";
import type { PendingChangesResult, SkillPendingChanges } from "./types.ts";

function parsePorcelainLine(line: string): { status: string; path: string } | null {
  if (line.length < 4) return null;

  const xy = line.slice(0, 2);
  const filePath = line.slice(3).replace(/^"/, "").replace(/"$/, "");
  if (!filePath) return null;

  if (xy === "??") return { status: "??", path: filePath };

  const x = xy[0];
  const y = xy[1];

  if (x === "D" || y === "D") return { status: "D", path: filePath };
  if (x === "A") return { status: "A", path: filePath };
  if (x === "R" || y === "R") return { status: "R", path: filePath };
  if (x === "M" || y === "M") return { status: "M", path: filePath };
  if (x === "C" || y === "C") return { status: "C", path: filePath };

  if (x !== " " || y !== " ") return { status: "M", path: filePath };

  return null;
}

function extractSkillName(filePath: string): string | null {
  const slash = filePath.indexOf("/");
  if (slash <= 0) return null;
  return filePath.slice(0, slash);
}

export function pendingChanges(workspace: string): PendingChangesResult {
  if (!hasHistory(workspace)) {
    return { skills: [], untracked: [], totalChanges: 0 };
  }

  const result = git(workspace, ["status", "--porcelain"]);
  if (!result.ok || !result.stdout.trim()) {
    return { skills: [], untracked: [], totalChanges: 0 };
  }

  const skillMap = new Map<string, SkillPendingChanges>();
  const untracked: string[] = [];
  let totalChanges = 0;

  for (const line of result.stdout.split("\n")) {
    const parsed = parsePorcelainLine(line);
    if (!parsed) continue;

    const skillName = extractSkillName(parsed.path);
    if (!skillName) {
      untracked.push(parsed.path);
      totalChanges++;
      continue;
    }

    if (!skillMap.has(skillName)) {
      skillMap.set(skillName, {
        name: skillName,
        created: [],
        modified: [],
        deleted: [],
        totalChanges: 0,
      });
    }
    const entry = skillMap.get(skillName)!;
    const relPath = parsed.path.slice(skillName.length + 1);

    if (parsed.status === "??" || parsed.status === "A") {
      entry.created.push(relPath);
    } else if (parsed.status === "M" || parsed.status === "R") {
      entry.modified.push(relPath);
    } else if (parsed.status === "D") {
      entry.deleted.push(relPath);
    }
    entry.totalChanges++;
    totalChanges++;
  }

  return {
    skills: [...skillMap.values()].sort((a, b) => a.name.localeCompare(b.name)),
    untracked,
    totalChanges,
  };
}

export function skillPendingChanges(workspace: string, name: string): SkillPendingChanges {
  const all = pendingChanges(workspace);
  return (
    all.skills.find((s) => s.name === name) ?? {
      name,
      created: [],
      modified: [],
      deleted: [],
      totalChanges: 0,
    }
  );
}

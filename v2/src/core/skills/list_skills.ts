import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { allSkillRanks } from "./all_skill_ranks.ts";
import { discoverSkills } from "./discover_skills.ts";
import { parseFrontmatter } from "./parse_frontmatter.ts";
import { pendingChanges } from "./pending_changes.ts";
import type { SkillSummary } from "./types.ts";

function countFiles(dirPath: string): number {
  let count = 0;
  let entries: string[];
  try {
    entries = readdirSync(dirPath);
  } catch {
    return 0;
  }

  for (const entry of entries) {
    if (entry.startsWith(".")) continue;
    const fullPath = join(dirPath, entry);
    try {
      if (statSync(fullPath).isDirectory()) {
        count += readdirSync(fullPath).filter((f) => !f.startsWith(".")).length;
      } else {
        count++;
      }
    } catch {
      count++;
    }
  }
  return count;
}

export function listSkills(workspace: string): SkillSummary[] {
  const names = discoverSkills(workspace);
  if (names.length === 0) return [];

  const ranks = allSkillRanks(workspace);
  const changes = pendingChanges(workspace);
  const changedSet = new Set(changes.skills.map((s) => s.name));

  const summaries: SkillSummary[] = [];

  for (const name of names) {
    const skillMd = join(workspace, "skills", name, "SKILL.md");
    let description = "(no description)";
    let bodyLines = 0;

    try {
      const content = readFileSync(skillMd, "utf-8");
      const { frontmatter, body } = parseFrontmatter(content);
      description = frontmatter?.description || description;
      bodyLines = body.split("\n").length;
    } catch {
      // use defaults
    }

    const fileCount = countFiles(join(workspace, "skills", name));

    summaries.push({
      name,
      description,
      rank: ranks[name] ?? 0,
      hasPendingChanges: changedSet.has(name),
      fileCount,
      bodyLines,
    });
  }

  return summaries;
}

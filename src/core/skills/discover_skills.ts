import { existsSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";

export function discoverSkills(workspace: string): string[] {
  const skillsDir = join(workspace, "skills");
  if (!existsSync(skillsDir)) return [];

  const names: string[] = [];
  let entries: string[];
  try {
    entries = readdirSync(skillsDir);
  } catch {
    return [];
  }

  for (const entry of entries) {
    if (entry.startsWith(".")) continue;

    const entryPath = join(skillsDir, entry);
    let isDir = false;
    try {
      isDir = statSync(entryPath).isDirectory();
    } catch {
      continue;
    }
    if (!isDir) continue;

    const skillMd = join(entryPath, "SKILL.md");
    if (existsSync(skillMd)) {
      names.push(entry);
    }
  }

  return names.sort();
}

import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { parseFrontmatter } from "./parse_frontmatter.ts";
import type { SkillIndexEntry } from "./types.ts";

function extractHeadingTitle(body: string): string {
  const line = body.split("\n").find((l) => l.trim().startsWith("#"));
  if (line) return line.replace(/^#+\s*/, "").trim();
  return "";
}

export function buildSkillIndex(workspace: string): SkillIndexEntry[] {
  const skillsDir = join(workspace, "skills");
  if (!existsSync(skillsDir)) return [];

  const entries: SkillIndexEntry[] = [];
  let dirNames: string[];
  try {
    dirNames = readdirSync(skillsDir);
  } catch {
    return [];
  }

  for (const dirName of dirNames) {
    if (dirName.startsWith(".")) continue;

    const dirPath = join(skillsDir, dirName);
    let isDir = false;
    try {
      isDir = statSync(dirPath).isDirectory();
    } catch {
      continue;
    }
    if (!isDir) continue;

    const skillMd = join(dirPath, "SKILL.md");
    if (!existsSync(skillMd)) continue;

    let content: string;
    try {
      content = readFileSync(skillMd, "utf-8");
    } catch {
      continue;
    }

    const { frontmatter, body } = parseFrontmatter(content);
    const name = frontmatter?.name || dirName;
    const description =
      frontmatter?.description || extractHeadingTitle(body) || "(no description)";

    entries.push({ name, description });
  }

  return entries.sort((a, b) => a.name.localeCompare(b.name));
}

export function formatSkillIndex(entries: SkillIndexEntry[]): string {
  if (entries.length === 0) return "";

  const lines = entries.map((e) => `- skills/${e.name}/: ${e.description}`);
  return [
    "## Skills",
    "",
    `You have ${entries.length} skill${entries.length === 1 ? "" : "s"}. ` +
      "Read a skill's SKILL.md with the `read` tool when it's relevant to the current task.",
    "",
    ...lines,
  ].join("\n");
}

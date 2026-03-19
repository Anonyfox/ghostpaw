import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { parseFrontmatter } from "./parse_frontmatter.ts";
import type { Skill, SkillFiles } from "./types.ts";

const KNOWN_SUBDIRS = new Set(["scripts", "references", "assets"]);

function listDir(dirPath: string): string[] {
  if (!existsSync(dirPath)) return [];
  try {
    return readdirSync(dirPath)
      .filter((f) => !f.startsWith("."))
      .sort();
  } catch {
    return [];
  }
}

function scanSkillFiles(skillPath: string): SkillFiles {
  const files: SkillFiles = { scripts: [], references: [], assets: [], other: [] };
  const entries = listDir(skillPath);

  for (const entry of entries) {
    if (entry === "SKILL.md") continue;
    const fullPath = join(skillPath, entry);
    let isDir = false;
    try {
      isDir = statSync(fullPath).isDirectory();
    } catch {
      continue;
    }

    if (isDir && KNOWN_SUBDIRS.has(entry)) {
      const subFiles = listDir(fullPath);
      if (entry === "scripts") files.scripts = subFiles;
      else if (entry === "references") files.references = subFiles;
      else if (entry === "assets") files.assets = subFiles;
    } else if (!isDir) {
      files.other.push(entry);
    }
  }

  return files;
}

function extractHeadingTitle(body: string): string {
  const line = body.split("\n").find((l) => l.trim().startsWith("#"));
  if (line) return line.replace(/^#+\s*/, "").trim();
  return "";
}

export function parseSkill(workspace: string, name: string): Skill | null {
  const skillPath = join(workspace, "skills", name);
  const skillMdPath = join(skillPath, "SKILL.md");

  if (!existsSync(skillMdPath)) return null;

  let content: string;
  try {
    content = readFileSync(skillMdPath, "utf-8");
  } catch {
    return null;
  }

  const { frontmatter, body } = parseFrontmatter(content);
  const files = scanSkillFiles(skillPath);

  const skillName = frontmatter?.name || name;
  const description = frontmatter?.description || extractHeadingTitle(body) || "(no description)";

  const effectiveFrontmatter = frontmatter ?? {
    name: skillName,
    description,
    raw: {},
  };

  return {
    name: skillName,
    description,
    frontmatter: effectiveFrontmatter,
    body,
    files,
    path: `skills/${name}`,
    skillMdPath: `skills/${name}/SKILL.md`,
  };
}

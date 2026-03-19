import { existsSync, mkdirSync, readFileSync, unlinkSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { parseFrontmatter } from "./parse_frontmatter.ts";
import type { RepairAction, RepairResult, ValidationIssue } from "./types.ts";
import { validateSkill } from "./validate_skill.ts";

function buildMinimalSkillMd(name: string): string {
  return `---\nname: ${name}\ndescription: (no description)\n---\n\n# ${name}\n`;
}

function addFrontmatterToContent(name: string, content: string): string {
  const firstLine = content.split("\n").find((l) => l.trim());
  const heading = firstLine?.startsWith("#") ? firstLine.replace(/^#+\s*/, "").trim() : "";
  const description = heading || "(no description)";
  return `---\nname: ${name}\ndescription: ${description}\n---\n\n${content}`;
}

export function repairSkill(workspace: string, name: string): RepairResult {
  const actions: RepairAction[] = [];
  const skillsDir = join(workspace, "skills");
  const skillDir = join(skillsDir, name);
  const skillMd = join(skillDir, "SKILL.md");

  const validation = validateSkill(workspace, name);
  const fixable = validation.issues.filter((i) => i.autoFixable);

  for (const issue of fixable) {
    switch (issue.code) {
      case "missing-skill-md": {
        try {
          mkdirSync(skillDir, { recursive: true });
          writeFileSync(skillMd, buildMinimalSkillMd(name), "utf-8");
          actions.push({
            code: "create-skill-md",
            description: `Created SKILL.md for ${name}`,
            applied: true,
          });
        } catch {
          actions.push({
            code: "create-skill-md",
            description: `Failed to create SKILL.md`,
            applied: false,
          });
        }
        break;
      }

      case "missing-frontmatter": {
        try {
          const content = readFileSync(skillMd, "utf-8");
          writeFileSync(skillMd, addFrontmatterToContent(name, content), "utf-8");
          actions.push({
            code: "add-frontmatter",
            description: `Added frontmatter to SKILL.md`,
            applied: true,
          });
        } catch {
          actions.push({
            code: "add-frontmatter",
            description: `Failed to add frontmatter`,
            applied: false,
          });
        }
        break;
      }

      case "missing-name": {
        try {
          const content = readFileSync(skillMd, "utf-8");
          const { frontmatter, body } = parseFrontmatter(content);
          if (frontmatter) {
            frontmatter.raw.name = name;
            const newFm = Object.entries(frontmatter.raw)
              .map(([k, v]) => `${k}: ${v}`)
              .join("\n");
            writeFileSync(skillMd, `---\n${newFm}\n---\n\n${body}`, "utf-8");
            actions.push({ code: "fix-name", description: `Set name to "${name}"`, applied: true });
          }
        } catch {
          actions.push({ code: "fix-name", description: `Failed to fix name`, applied: false });
        }
        break;
      }

      case "name-mismatch": {
        try {
          const content = readFileSync(skillMd, "utf-8");
          const { frontmatter, body } = parseFrontmatter(content);
          if (frontmatter) {
            frontmatter.raw.name = name;
            const newFm = Object.entries(frontmatter.raw)
              .map(([k, v]) => `${k}: ${v}`)
              .join("\n");
            writeFileSync(skillMd, `---\n${newFm}\n---\n\n${body}`, "utf-8");
            actions.push({
              code: "fix-name",
              description: `Updated name to match directory "${name}"`,
              applied: true,
            });
          }
        } catch {
          actions.push({
            code: "fix-name",
            description: `Failed to fix name mismatch`,
            applied: false,
          });
        }
        break;
      }

      case "git-artifact": {
        try {
          const gitFile = join(skillDir, ".git");
          if (existsSync(gitFile)) unlinkSync(gitFile);
          actions.push({
            code: "remove-git-artifact",
            description: `Removed .git file`,
            applied: true,
          });
        } catch {
          actions.push({
            code: "remove-git-artifact",
            description: `Failed to remove .git`,
            applied: false,
          });
        }
        break;
      }
    }
  }

  const revalidation = validateSkill(workspace, name);
  const remainingIssues: ValidationIssue[] = revalidation.issues;

  return { name, actions, remainingIssues };
}

export function repairFlatFile(workspace: string, filename: string): RepairResult {
  const skillsDir = join(workspace, "skills");
  const flatPath = join(skillsDir, filename);
  const baseName = filename.replace(/\.md$/, "");
  const targetDir = join(skillsDir, baseName);
  const targetMd = join(targetDir, "SKILL.md");
  const actions: RepairAction[] = [];

  if (!existsSync(flatPath)) {
    return { name: baseName, actions: [], remainingIssues: [] };
  }

  if (existsSync(targetDir)) {
    actions.push({
      code: "migrate-flat-file",
      description: `Cannot migrate: directory skills/${baseName}/ already exists.`,
      applied: false,
    });
    return { name: baseName, actions, remainingIssues: [] };
  }

  try {
    mkdirSync(targetDir, { recursive: true });
    const content = readFileSync(flatPath, "utf-8");
    const { frontmatter } = parseFrontmatter(content);

    if (frontmatter) {
      writeFileSync(targetMd, content, "utf-8");
    } else {
      writeFileSync(targetMd, addFrontmatterToContent(baseName, content), "utf-8");
    }

    unlinkSync(flatPath);
    actions.push({
      code: "migrate-flat-file",
      description: `Migrated skills/${filename} to skills/${baseName}/SKILL.md`,
      applied: true,
    });
  } catch {
    actions.push({
      code: "migrate-flat-file",
      description: `Failed to migrate ${filename}`,
      applied: false,
    });
  }

  const revalidation = validateSkill(workspace, baseName);
  return { name: baseName, actions, remainingIssues: revalidation.issues };
}

import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { parseFrontmatter } from "./parse_frontmatter.ts";
import { skillRank } from "./skill_rank.ts";
import { skillTier } from "./skill_tier.ts";
import type { ValidationIssue, ValidationResult } from "./types.ts";

const VALID_DIR_NAME = /^[a-z0-9]+(-[a-z0-9]+)*$/;

function issue(
  severity: ValidationIssue["severity"],
  code: string,
  message: string,
  autoFixable: boolean,
): ValidationIssue {
  return { severity, code, message, autoFixable };
}

function validateSingleSkill(workspace: string, name: string): ValidationResult {
  const skillDir = join(workspace, "skills", name);
  const skillMd = join(skillDir, "SKILL.md");
  const issues: ValidationIssue[] = [];

  if (!VALID_DIR_NAME.test(name)) {
    issues.push(
      issue(
        "error",
        "invalid-name-chars",
        `Directory name "${name}" must be lowercase alphanumeric with hyphens only.`,
        false,
      ),
    );
  }

  if (!existsSync(skillMd)) {
    issues.push(issue("error", "missing-skill-md", `No SKILL.md found in skills/${name}/.`, true));
    return {
      name,
      path: `skills/${name}`,
      valid: issues.every((i) => i.severity !== "error"),
      issues,
    };
  }

  let content: string;
  try {
    content = readFileSync(skillMd, "utf-8");
  } catch {
    issues.push(issue("error", "missing-skill-md", `Cannot read skills/${name}/SKILL.md.`, false));
    return { name, path: `skills/${name}`, valid: false, issues };
  }

  const { frontmatter, body } = parseFrontmatter(content);

  if (!frontmatter) {
    issues.push(issue("error", "missing-frontmatter", `SKILL.md has no YAML frontmatter.`, true));
  } else {
    if (!frontmatter.name) {
      issues.push(issue("warning", "missing-name", `Frontmatter is missing "name" field.`, true));
    } else if (frontmatter.name !== name) {
      issues.push(
        issue(
          "warning",
          "name-mismatch",
          `Frontmatter name "${frontmatter.name}" doesn't match directory "${name}".`,
          true,
        ),
      );
    }

    if (!frontmatter.description) {
      issues.push(
        issue("error", "missing-description", `Frontmatter is missing "description" field.`, false),
      );
    }
  }

  if (!body.trim()) {
    issues.push(
      issue("warning", "empty-body", `SKILL.md has no instructions after frontmatter.`, false),
    );
  }

  const bodyLines = body.split("\n").length;
  if (bodyLines > 500) {
    issues.push(
      issue("info", "oversized-body", `SKILL.md body is ${bodyLines} lines (>500).`, false),
    );
  }

  const gitArtifact = join(skillDir, ".git");
  if (existsSync(gitArtifact)) {
    issues.push(issue("warning", "git-artifact", `.git file found inside skills/${name}/.`, true));
  }

  checkTierRequirements(workspace, name, body, issues);

  return {
    name,
    path: `skills/${name}`,
    valid: issues.every((i) => i.severity !== "error"),
    issues,
  };
}

const FAILURE_HEADING = /^#{1,3}\s.*(fail|error|recover|fallback|rollback)/im;
const EDGE_CASE_HEADING = /^#{1,3}\s.*(edge|caveat|limit|corner|gotcha|warning)/im;
const SUMMARY_HEADING = /^#{1,3}\s.*(summar|compiled|quick.?ref|tl;?dr)/im;

function checkTierRequirements(
  workspace: string,
  name: string,
  body: string,
  issues: ValidationIssue[],
): void {
  const rank = skillRank(workspace, name);
  const { tier } = skillTier(rank);

  if (tier === "Apprentice" || tier === "Uncheckpointed") {
    if (!FAILURE_HEADING.test(body)) {
      issues.push(
        issue(
          "info",
          "tier-next-journeyman",
          "Next tier (Journeyman): add a failure/recovery section.",
          false,
        ),
      );
    }
  }

  if (tier === "Journeyman") {
    if (!FAILURE_HEADING.test(body)) {
      issues.push(
        issue(
          "info",
          "tier-req-journeyman",
          "Journeyman requires a failure/recovery section.",
          false,
        ),
      );
    }
    if (!EDGE_CASE_HEADING.test(body)) {
      issues.push(
        issue(
          "info",
          "tier-next-expert",
          "Next tier (Expert): add an edge cases/caveats section.",
          false,
        ),
      );
    }
  }

  if (tier === "Expert") {
    if (!EDGE_CASE_HEADING.test(body)) {
      issues.push(
        issue("info", "tier-req-expert", "Expert requires an edge cases/caveats section.", false),
      );
    }
    if (!SUMMARY_HEADING.test(body)) {
      issues.push(
        issue(
          "info",
          "tier-next-master",
          "Next tier (Master): add a compiled execution summary.",
          false,
        ),
      );
    }
  }

  if (tier === "Master") {
    if (!SUMMARY_HEADING.test(body)) {
      issues.push(
        issue("info", "tier-req-master", "Master requires a compiled execution summary.", false),
      );
    }
  }
}

export function validateSkill(workspace: string, name: string): ValidationResult {
  return validateSingleSkill(workspace, name);
}

export function validateAllSkills(workspace: string): ValidationResult[] {
  const skillsDir = join(workspace, "skills");
  if (!existsSync(skillsDir)) return [];

  const results: ValidationResult[] = [];
  let entries: string[];
  try {
    entries = readdirSync(skillsDir);
  } catch {
    return [];
  }

  for (const entry of entries) {
    if (entry.startsWith(".")) continue;
    const fullPath = join(skillsDir, entry);

    let isDir = false;
    try {
      isDir = statSync(fullPath).isDirectory();
    } catch {
      continue;
    }

    if (isDir) {
      results.push(validateSingleSkill(workspace, entry));
    } else if (entry.endsWith(".md")) {
      const baseName = entry.replace(/\.md$/, "");
      results.push({
        name: baseName,
        path: `skills/${entry}`,
        valid: false,
        issues: [
          issue(
            "warning",
            "flat-file",
            `"${entry}" is a flat file — should be skills/${baseName}/SKILL.md.`,
            true,
          ),
        ],
      });
    }
  }

  return results.sort((a, b) => a.name.localeCompare(b.name));
}

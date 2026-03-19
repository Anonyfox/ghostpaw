import { parseFrontmatter } from "../../parse_frontmatter.ts";
import { skillRank } from "../../skill_rank.ts";
import { skillTier } from "../../skill_tier.ts";

export function projectSkillReadContent(
  workspace: string,
  skillName: string,
  rawContent: string,
): string {
  try {
    const rank = skillRank(workspace, skillName);
    const { tier } = skillTier(rank);

    if (tier === "Master") {
      const { frontmatter, body } = parseFrontmatter(rawContent);
      const summaryMatch = body.match(
        /^(##\s+(?:Summary|Compiled Summary|Overview)[^\n]*\n[\s\S]*?)(?=\n##\s|\n*$)/m,
      );
      if (summaryMatch) {
        const totalLines = rawContent.split("\n").length;
        const fmBlock = frontmatter
          ? `---\nname: ${frontmatter.name}\ndescription: ${frontmatter.description}\n---\n\n`
          : "";
        return `${fmBlock}${summaryMatch[1].trim()}\n\n(Master-tier compiled view. Full content: ${totalLines} lines.)`;
      }
    }

    if (tier === "Expert") {
      const { frontmatter } = parseFrontmatter(rawContent);
      if (frontmatter?.allowedTools) {
        return `${rawContent}\n\n<!-- Expert-tier restriction: only use these tools when following this skill: ${frontmatter.allowedTools} -->`;
      }
    }
  } catch {
    // best-effort content shaping
  }

  return rawContent;
}

import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { createTool, Schema } from "chatoyant";
import type { MemoryStore } from "../core/memory.js";
import type { SessionStore } from "../core/session.js";
import {
  diffSkills,
  getAllSkillRanks,
  getSkillLog,
  getSkillRank,
  hasHistory,
} from "../lib/skill-history.js";

class SkillsParams extends Schema {
  action = Schema.Enum(["list", "rank", "history", "diff", "status"] as const, {
    description:
      "list: all skills with titles and ranks. " +
      "rank: rank of a specific skill file. " +
      "history: git commit log for a skill (or all skills). " +
      "diff: uncommitted changes since last training session. " +
      "status: growth stats (unabsorbed sessions, memory count, skill count).",
  });
  filename = Schema.String({
    description: "Skill filename (e.g. deploy.md). Required for rank, optional for history.",
    optional: true,
  });
}

function extractTitle(content: string): string {
  const line = content.split("\n").find((l) => l.trim().startsWith("#"));
  if (line) return line.replace(/^#+\s*/, "").trim();
  return "(untitled)";
}

export interface SkillsToolConfig {
  workspacePath: string;
  sessions?: SessionStore;
  memory?: MemoryStore;
}

function normalizeSkillFilename(raw: string): string {
  return raw.replace(/^skills\//, "");
}

export function createSkillsTool(configOrPath: string | SkillsToolConfig) {
  const config: SkillsToolConfig =
    typeof configOrPath === "string" ? { workspacePath: configOrPath } : configOrPath;
  const { workspacePath, sessions, memory } = config;
  const skillsDir = join(workspacePath, "skills");

  return createTool({
    name: "skills",
    description:
      "Introspect your skill set. List all skills with their training rank, " +
      "view a skill's evolution history, check what changed since the last training session, " +
      "or check growth status to see if training would be useful.",
    // biome-ignore lint: TS index-signature limitation on class instances vs SchemaInstance
    parameters: new SkillsParams() as any,
    execute: async ({ args }) => {
      const { action, filename: rawFilename } = args as {
        action: "list" | "rank" | "history" | "diff" | "status";
        filename?: string;
      };
      const filename = rawFilename ? normalizeSkillFilename(rawFilename) : undefined;

      switch (action) {
        case "list": {
          if (!existsSync(skillsDir)) return { skills: [], total: 0 };

          const files = readdirSync(skillsDir)
            .filter((f) => f.endsWith(".md"))
            .sort();

          const ranks = hasHistory(workspacePath) ? getAllSkillRanks(workspacePath) : {};

          const skills = files.map((f) => {
            const content = readFileSync(join(skillsDir, f), "utf-8");
            return {
              filename: f,
              path: `skills/${f}`,
              title: extractTitle(content),
              rank: ranks[f] ?? 0,
              lines: content.split("\n").length,
            };
          });

          return { skills, total: skills.length };
        }

        case "rank": {
          if (!filename) return { error: "filename is required for rank" };

          const rank = getSkillRank(workspacePath, filename);
          const filePath = join(skillsDir, filename);
          const title = existsSync(filePath)
            ? extractTitle(readFileSync(filePath, "utf-8"))
            : "(not found)";

          return { filename, title, rank };
        }

        case "history": {
          const log = getSkillLog(workspacePath, filename);
          return {
            filename: filename ?? "(all)",
            entries: log,
            total: log.length,
          };
        }

        case "diff": {
          const d = diffSkills(workspacePath);
          if (!d) return { tracked: false, message: "Skill history not initialized" };

          return {
            tracked: true,
            created: d.created,
            updated: d.updated,
            deleted: d.deleted,
            totalChanges: d.created.length + d.updated.length + d.deleted.length,
          };
        }

        case "status": {
          const skillFiles = existsSync(skillsDir)
            ? readdirSync(skillsDir).filter((f) => f.endsWith(".md"))
            : [];

          const ranks = hasHistory(workspacePath) ? getAllSkillRanks(workspacePath) : {};
          const rankValues = Object.values(ranks);
          const averageRank =
            rankValues.length > 0
              ? Math.round((rankValues.reduce((a, b) => a + b, 0) / rankValues.length) * 10) / 10
              : 0;

          const d = diffSkills(workspacePath);
          const uncommittedChanges = d ? d.created.length + d.updated.length + d.deleted.length : 0;

          const result: Record<string, unknown> = {
            skills_count: skillFiles.length,
            average_rank: averageRank,
            uncommitted_changes: uncommittedChanges,
          };

          if (sessions) {
            result.unabsorbed_sessions = sessions.countUnabsorbed();
          }

          if (memory) {
            result.memories_total = memory.count();
          }

          const logEntries = getSkillLog(workspacePath);
          if (logEntries.length > 0) {
            const lastEntry = logEntries[0];
            result.last_training_commit = lastEntry;
          }

          return result;
        }
      }
    },
  });
}

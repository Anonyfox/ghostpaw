import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

export interface AgentProfile {
  name: string;
  systemPrompt: string;
}

const SAFE_NAME = /^[a-zA-Z0-9_-]+$/;

export function listAgentProfiles(workspacePath: string): string[] {
  const agentsDir = join(workspacePath, "agents");
  if (!existsSync(agentsDir)) return [];

  try {
    return readdirSync(agentsDir)
      .filter((f) => f.endsWith(".md"))
      .map((f) => f.replace(/\.md$/, ""))
      .filter((name) => {
        const content = readFileSync(join(agentsDir, `${name}.md`), "utf-8").trim();
        return content.length > 0;
      })
      .sort();
  } catch {
    return [];
  }
}

export interface AgentSummary {
  name: string;
  title: string;
  summary: string;
}

function extractTitleAndSummary(content: string): { title: string; summary: string } {
  const lines = content.split("\n");
  let title = "";
  let summary = "";

  for (const line of lines) {
    const trimmed = line.trim();
    if (!title && trimmed.startsWith("#")) {
      title = trimmed.replace(/^#+\s*/, "").trim();
      continue;
    }
    if (title && !summary && trimmed.length > 0) {
      summary = trimmed.replace(/\*\*/g, "").slice(0, 120);
      break;
    }
  }

  return { title: title || "(untitled)", summary };
}

export function getAgentSummary(workspacePath: string, name: string): AgentSummary | null {
  if (!name || !SAFE_NAME.test(name)) return null;

  const filePath = join(workspacePath, "agents", `${name}.md`);
  if (!existsSync(filePath)) return null;

  const content = readFileSync(filePath, "utf-8").trim();
  if (!content) return null;

  const { title, summary } = extractTitleAndSummary(content);
  return { name, title, summary };
}

export function getAgentProfile(workspacePath: string, name: string): AgentProfile | null {
  if (!name || !SAFE_NAME.test(name)) return null;

  const filePath = join(workspacePath, "agents", `${name}.md`);
  if (!existsSync(filePath)) return null;

  const content = readFileSync(filePath, "utf-8").trim();
  if (!content) return null;

  return { name, systemPrompt: content };
}

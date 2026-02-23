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

export function getAgentProfile(workspacePath: string, name: string): AgentProfile | null {
  if (!name || !SAFE_NAME.test(name)) return null;

  const filePath = join(workspacePath, "agents", `${name}.md`);
  if (!existsSync(filePath)) return null;

  const content = readFileSync(filePath, "utf-8").trim();
  if (!content) return null;

  return { name, systemPrompt: content };
}

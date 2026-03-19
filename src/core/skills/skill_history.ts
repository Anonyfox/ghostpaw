import { git, hasHistory } from "./git.ts";
import { assertSafeSkillName } from "./safe_name.ts";
import type { HistoryEntry } from "./types.ts";

export function skillHistory(workspace: string, name?: string): HistoryEntry[] {
  if (!hasHistory(workspace)) return [];

  const args = ["log", "--oneline", "--no-decorate"];
  if (name) {
    assertSafeSkillName(name);
    args.push("--", `${name}/`);
  }

  const result = git(workspace, args);
  if (!result.ok || !result.stdout) return [];

  return result.stdout
    .split("\n")
    .filter((l) => l.trim())
    .map((line) => {
      const spaceIdx = line.indexOf(" ");
      if (spaceIdx === -1) return { hash: line.trim(), message: "" };
      return {
        hash: line.slice(0, spaceIdx),
        message: line.slice(spaceIdx + 1),
      };
    });
}

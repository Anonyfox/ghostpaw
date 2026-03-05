import { git, hasHistory } from "./git.ts";
import { assertSafeSkillName } from "./safe_name.ts";

export function skillRank(workspace: string, name: string): number {
  if (!hasHistory(workspace)) return 0;
  assertSafeSkillName(name);

  const result = git(workspace, ["log", "--oneline", "--", `${name}/`]);
  if (!result.ok || !result.stdout) return 0;

  return result.stdout.split("\n").filter((l) => l.trim()).length;
}

import { git, hasHistory } from "./git.ts";
import { assertSafeSkillName } from "./safe_name.ts";

export function skillDiff(workspace: string, name: string): string | null {
  if (!hasHistory(workspace)) return null;
  assertSafeSkillName(name);

  const tracked = git(workspace, ["diff", "--", `${name}/`]);
  const staged = git(workspace, ["diff", "--cached", "--", `${name}/`]);

  const parts: string[] = [];
  if (tracked.ok && tracked.stdout) parts.push(tracked.stdout);
  if (staged.ok && staged.stdout) parts.push(staged.stdout);

  const untracked = git(workspace, [
    "ls-files",
    "--others",
    "--exclude-standard",
    "--",
    `${name}/`,
  ]);
  if (untracked.ok && untracked.stdout) {
    for (const file of untracked.stdout.split("\n").filter((l) => l.trim())) {
      parts.push(`new file: ${file}`);
    }
  }

  if (parts.length === 0) return null;
  return parts.join("\n");
}

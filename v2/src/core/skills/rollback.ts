import { git, hasHistory } from "./git.ts";
import { assertSafeSkillName } from "./safe_name.ts";

const SAFE_REF = /^[a-zA-Z0-9_.~^:/@{}-]+$/;

export function rollback(workspace: string, name: string, commitRef: string): boolean {
  if (!hasHistory(workspace)) return false;
  assertSafeSkillName(name);

  if (!commitRef || !SAFE_REF.test(commitRef)) return false;

  const result = git(workspace, ["checkout", commitRef, "--", `${name}/`]);
  return result.ok;
}

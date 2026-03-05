const UNSAFE_PATTERNS = ["..", "/", "\\"];

export function isSafeSkillName(name: string): boolean {
  if (!name) return false;
  if (name.startsWith("-")) return false;
  for (const pattern of UNSAFE_PATTERNS) {
    if (name.includes(pattern)) return false;
  }
  return true;
}

export function assertSafeSkillName(name: string): void {
  if (!isSafeSkillName(name)) {
    throw new Error(
      `Unsafe skill name "${name}": must not be empty, start with "-", or contain "..", "/", or "\\".`,
    );
  }
}

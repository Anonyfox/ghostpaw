export function resolveHttpAuth(
  authName: string | undefined,
  resolveSecret: (name: string) => string | null,
): Record<string, string> | undefined {
  if (!authName) return undefined;
  const trimmed = authName.trim();
  if (!trimmed) return undefined;
  const value = resolveSecret(trimmed);
  if (!value) return undefined;
  return { Authorization: `Bearer ${value}` };
}

export function resolveStdioEnv(
  authNames: string | undefined,
  resolveSecret: (name: string) => string | null,
): Record<string, string> | undefined {
  if (!authNames) return undefined;
  const env: Record<string, string> = {};
  let hasAny = false;
  for (const name of authNames.split(",")) {
    const trimmed = name.trim();
    if (!trimmed) continue;
    const value = resolveSecret(trimmed);
    if (value) {
      env[trimmed] = value;
      hasAny = true;
    }
  }
  return hasAny ? env : undefined;
}

const secretEnvNames = new Set<string>();

export function registerSecretKey(envName: string): void {
  secretEnvNames.add(envName);
}

export function unregisterSecretKey(envName: string): void {
  secretEnvNames.delete(envName);
}

export function getSecretValues(): string[] {
  const values: string[] = [];
  for (const envName of secretEnvNames) {
    const v = process.env[envName];
    if (v && v.length >= 8) {
      values.push(v);
    }
  }
  return values;
}

export function clearSecretRegistry(): void {
  secretEnvNames.clear();
}

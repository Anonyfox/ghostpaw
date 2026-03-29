export function getSetting(key: string): string | undefined {
  return process.env[key] || undefined;
}

export function getSettingInt(key: string): number | undefined {
  const v = getSetting(key);
  if (v === undefined) return undefined;
  const n = Number.parseInt(v, 10);
  return Number.isNaN(n) ? undefined : n;
}

export function getSettingBool(key: string): boolean | undefined {
  const v = getSetting(key);
  if (v === undefined) return undefined;
  return v === "true" || v === "1";
}

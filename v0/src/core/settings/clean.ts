export function cleanValue(raw: string): string {
  let v = raw.trim();
  const exportMatch = v.match(/^(?:export\s+)?[A-Za-z_][A-Za-z0-9_]*\s*=\s*(.*)/s);
  if (exportMatch) {
    v = exportMatch[1].trim();
  }
  if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) {
    v = v.slice(1, -1);
  }
  return v.trim();
}

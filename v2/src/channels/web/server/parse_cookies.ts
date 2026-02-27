export function parseCookies(header: string | undefined): Record<string, string> {
  if (header === undefined || header === "") {
    return {};
  }
  const result: Record<string, string> = {};
  for (const part of header.split(";")) {
    const eqIdx = part.indexOf("=");
    if (eqIdx === -1) continue;
    const key = part.slice(0, eqIdx).trim();
    const value = part.slice(eqIdx + 1).trim();
    result[key] = value;
  }
  return result;
}

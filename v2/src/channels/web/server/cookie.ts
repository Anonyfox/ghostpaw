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

export function setSessionCookie(
  res: { setHeader(name: string, value: string | string[]): void },
  token: string,
  secure: boolean,
): void {
  const parts = [
    `ghostpaw_session=${token}`,
    "HttpOnly",
    "SameSite=Strict",
    "Path=/",
    "Max-Age=2592000",
  ];
  if (secure) parts.push("Secure");
  res.setHeader("Set-Cookie", parts.join("; "));
}

export function clearSessionCookie(
  res: { setHeader(name: string, value: string | string[]): void },
  secure: boolean,
): void {
  const parts = ["ghostpaw_session=", "HttpOnly", "SameSite=Strict", "Path=/", "Max-Age=0"];
  if (secure) parts.push("Secure");
  res.setHeader("Set-Cookie", parts.join("; "));
}

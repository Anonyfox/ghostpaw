export function clearSessionCookie(
  res: { setHeader(name: string, value: string | string[]): void },
  secure: boolean,
): void {
  const parts = ["ghostpaw_session=", "HttpOnly", "SameSite=Strict", "Path=/", "Max-Age=0"];
  if (secure) parts.push("Secure");
  res.setHeader("Set-Cookie", parts.join("; "));
}

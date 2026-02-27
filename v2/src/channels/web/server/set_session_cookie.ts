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

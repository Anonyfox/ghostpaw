import type { Route } from "./types.ts";

export function matchRoute(
  routes: Route[],
  method: string,
  url: string,
): { route: Route; params: Record<string, string> } | null {
  let path: string;
  try {
    const parsed = new URL(url);
    path = parsed.pathname;
  } catch {
    return null;
  }
  if (path === "") path = "/";
  const methodUpper = method.toUpperCase();
  for (const route of routes) {
    if (route.method !== methodUpper) continue;
    const m = route.pattern.exec(path);
    if (!m) continue;
    const params: Record<string, string> = {};
    for (let i = 0; i < route.paramNames.length; i++) {
      params[route.paramNames[i]] = m[i + 1] ?? "";
    }
    return { route, params };
  }
  return null;
}

import type { Route, RouteHandler } from "./types.ts";

export function createRoute(
  method: string,
  path: string,
  handler: RouteHandler,
  requiresAuth = true,
): Route {
  const paramNames: string[] = [];
  const patternParts = path.split("/").map((seg) => {
    if (seg.startsWith(":")) {
      paramNames.push(seg.slice(1));
      return "([^/]+)";
    }
    return seg.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  });
  const patternStr = `^${patternParts.join("/")}$`;
  const pattern = new RegExp(patternStr);
  return {
    method: method.toUpperCase(),
    pattern,
    paramNames,
    handler,
    requiresAuth,
  };
}

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

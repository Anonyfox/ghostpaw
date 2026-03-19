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

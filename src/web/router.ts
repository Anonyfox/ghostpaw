import type { Route, RouteHandler } from "./types.js";

export function createRouter() {
  const routes: Route[] = [];

  function add(method: string, path: string, handler: RouteHandler, requiresAuth = true) {
    const escaped = path.replace(/:[a-zA-Z]+/g, "([^/]+)");
    routes.push({ method, pattern: new RegExp(`^${escaped}$`), handler, requiresAuth });
  }

  function match(
    method: string,
    path: string,
  ): { handler: RouteHandler; requiresAuth: boolean } | null {
    for (const route of routes) {
      if (route.method === method && route.pattern.test(path)) {
        return { handler: route.handler, requiresAuth: route.requiresAuth };
      }
    }
    return null;
  }

  return { add, match };
}

export type Router = ReturnType<typeof createRouter>;

export function extractParam(path: string, pattern: string): string | null {
  const escaped = pattern.replace(/:[a-zA-Z]+/g, "([^/]+)");
  const match = path.match(new RegExp(`^${escaped}$`));
  return match?.[1] ?? null;
}

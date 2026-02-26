import { deepStrictEqual, ok, strictEqual } from "node:assert/strict";
import { describe, it } from "node:test";
import { createRoute, matchRoute } from "./router.ts";
import type { Route } from "./types.ts";

const noop = (): void => {};

describe("createRoute", () => {
  it("creates static route with no params and requiresAuth true by default", () => {
    const route = createRoute("GET", "/api/auth/login", noop);
    strictEqual(route.method, "GET");
    ok(route.pattern.test("/api/auth/login"));
    strictEqual(route.paramNames.length, 0);
    strictEqual(route.requiresAuth, true);
  });

  it("creates parameterized route and extracts param names", () => {
    const route = createRoute("GET", "/api/sessions/:id", noop);
    strictEqual(route.method, "GET");
    ok(route.pattern.test("/api/sessions/abc123"));
    deepStrictEqual(route.paramNames, ["id"]);
  });

  it("defaults requiresAuth to true", () => {
    const route = createRoute("POST", "/api/login", noop);
    strictEqual(route.requiresAuth, true);
  });

  it("accepts requiresAuth false", () => {
    const route = createRoute("POST", "/api/login", noop, false);
    strictEqual(route.requiresAuth, false);
  });

  it("creates route with multiple params", () => {
    const route = createRoute("GET", "/users/:userId/posts/:postId", noop);
    ok(route.pattern.test("/users/u1/posts/p2"));
    deepStrictEqual(route.paramNames, ["userId", "postId"]);
  });
});

describe("matchRoute", () => {
  it("matches static route on exact path", () => {
    const route = createRoute("GET", "/api/auth/login", noop);
    const result = matchRoute([route], "GET", "http://localhost:3000/api/auth/login");
    ok(result);
    strictEqual(result.route, route);
    deepStrictEqual(result.params, {});
  });

  it("extracts params from parameterized route", () => {
    const route = createRoute("GET", "/api/sessions/:id", noop);
    const result = matchRoute([route], "GET", "http://localhost:3000/api/sessions/abc123");
    ok(result);
    strictEqual(result.route, route);
    deepStrictEqual(result.params, { id: "abc123" });
  });

  it("returns first match when multiple routes match", () => {
    const r1 = createRoute("GET", "/api/foo", noop);
    const r2 = createRoute("GET", "/api/:wildcard", noop);
    const routes: Route[] = [r1, r2];
    const result = matchRoute(routes, "GET", "http://x/api/foo");
    ok(result);
    strictEqual(result.route, r1);
  });

  it("returns null when no route matches", () => {
    const route = createRoute("GET", "/api/auth/login", noop);
    const result = matchRoute([route], "GET", "http://localhost:3000/api/other");
    strictEqual(result, null);
  });

  it("returns null when method does not match", () => {
    const route = createRoute("GET", "/api/auth/login", noop);
    const result = matchRoute([route], "POST", "http://localhost:3000/api/auth/login");
    strictEqual(result, null);
  });

  it("compares method case-insensitively", () => {
    const route = createRoute("GET", "/api/auth/login", noop);
    const result = matchRoute([route], "get", "http://localhost:3000/api/auth/login");
    ok(result);
    strictEqual(result.route, route);
  });

  it("does not match /foo/ when route is /foo", () => {
    const route = createRoute("GET", "/foo", noop);
    const result = matchRoute([route], "GET", "http://localhost:3000/foo/");
    strictEqual(result, null);
  });

  it("does not match /foo when route is /foo/", () => {
    const route = createRoute("GET", "/foo/", noop);
    const result = matchRoute([route], "GET", "http://localhost:3000/foo");
    strictEqual(result, null);
  });

  it("strips query string before matching", () => {
    const route = createRoute("GET", "/api/auth/login", noop);
    const result = matchRoute([route], "GET", "http://localhost:3000/api/auth/login?redirect=/");
    ok(result);
    strictEqual(result.route, route);
  });

  it("extracts multiple params correctly", () => {
    const route = createRoute("GET", "/users/:userId/posts/:postId", noop);
    const result = matchRoute([route], "GET", "http://localhost:3000/users/u1/posts/p2");
    ok(result);
    deepStrictEqual(result.params, { userId: "u1", postId: "p2" });
  });

  it("returns null for empty routes array", () => {
    const result = matchRoute([], "GET", "http://localhost:3000/api/auth/login");
    strictEqual(result, null);
  });

  it("handles URL with no path (just domain) gracefully", () => {
    const route = createRoute("GET", "/", noop);
    const result = matchRoute([route], "GET", "http://localhost:3000/");
    ok(result);
    strictEqual(result.route, route);
    deepStrictEqual(result.params, {});
  });

  it("returns null when path is empty and no root route exists", () => {
    const route = createRoute("GET", "/api/foo", noop);
    const result = matchRoute([route], "GET", "http://localhost:3000");
    strictEqual(result, null);
  });
});

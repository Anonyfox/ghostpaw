import { deepStrictEqual, ok, strictEqual } from "node:assert/strict";
import { describe, it } from "node:test";
import { createRoute } from "./create_route.ts";

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

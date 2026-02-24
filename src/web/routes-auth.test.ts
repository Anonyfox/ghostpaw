import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { createRouter } from "./router.js";
import { registerAuthRoutes } from "./routes-auth.js";

describe("routes-auth", () => {
  it("registers /health as GET without auth", () => {
    const router = createRouter();
    registerAuthRoutes(router);
    const match = router.match("GET", "/health");
    assert.ok(match);
    assert.strictEqual(match.requiresAuth, false);
  });

  it("registers GET /login without auth", () => {
    const router = createRouter();
    registerAuthRoutes(router);
    const match = router.match("GET", "/login");
    assert.ok(match);
    assert.strictEqual(match.requiresAuth, false);
  });

  it("registers POST /login without auth", () => {
    const router = createRouter();
    registerAuthRoutes(router);
    const match = router.match("POST", "/login");
    assert.ok(match);
    assert.strictEqual(match.requiresAuth, false);
  });

  it("registers POST /logout without auth", () => {
    const router = createRouter();
    registerAuthRoutes(router);
    const match = router.match("POST", "/logout");
    assert.ok(match);
    assert.strictEqual(match.requiresAuth, false);
  });

  it("registers GET / with auth required", () => {
    const router = createRouter();
    registerAuthRoutes(router);
    const match = router.match("GET", "/");
    assert.ok(match);
    assert.strictEqual(match.requiresAuth, true);
  });
});

import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { createRouter, extractParam } from "./router.js";

describe("router", () => {
  describe("createRouter", () => {
    it("matches exact paths", () => {
      const router = createRouter();
      const handler = () => {};
      router.add("GET", "/health", handler, false);
      const result = router.match("GET", "/health");
      assert.ok(result);
      assert.strictEqual(result.requiresAuth, false);
    });

    it("returns null for unmatched paths", () => {
      const router = createRouter();
      router.add("GET", "/health", () => {}, false);
      assert.strictEqual(router.match("GET", "/missing"), null);
    });

    it("returns null for wrong method", () => {
      const router = createRouter();
      router.add("GET", "/health", () => {}, false);
      assert.strictEqual(router.match("POST", "/health"), null);
    });

    it("matches parameterized paths", () => {
      const router = createRouter();
      router.add("GET", "/api/sessions/:key/messages", () => {});
      assert.ok(router.match("GET", "/api/sessions/web%3Atest/messages"));
    });

    it("does not match partial paths", () => {
      const router = createRouter();
      router.add("GET", "/api/status", () => {});
      assert.strictEqual(router.match("GET", "/api/status/extra"), null);
    });

    it("defaults requiresAuth to true", () => {
      const router = createRouter();
      router.add("GET", "/protected", () => {});
      const result = router.match("GET", "/protected");
      assert.ok(result);
      assert.strictEqual(result.requiresAuth, true);
    });
  });

  describe("extractParam", () => {
    it("extracts single parameter", () => {
      assert.strictEqual(
        extractParam("/api/sessions/abc/messages", "/api/sessions/:key/messages"),
        "abc",
      );
    });

    it("extracts URL-encoded parameter", () => {
      assert.strictEqual(
        extractParam("/api/sessions/web%3Atest/chat", "/api/sessions/:key/chat"),
        "web%3Atest",
      );
    });

    it("returns null for non-matching path", () => {
      assert.strictEqual(extractParam("/api/other/abc", "/api/sessions/:key"), null);
    });

    it("returns null for empty path", () => {
      assert.strictEqual(extractParam("", "/api/:id"), null);
    });
  });
});

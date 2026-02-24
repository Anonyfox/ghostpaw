import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { html, json, redirect } from "./response.js";

function mockRes() {
  const headers: Record<string, string> = {};
  let statusCode = 0;
  let body = "";
  return {
    writeHead(status: number, hdrs: Record<string, string> = {}) {
      statusCode = status;
      Object.assign(headers, hdrs);
    },
    end(data?: string) {
      if (data) body = data;
    },
    get status() {
      return statusCode;
    },
    get body() {
      return body;
    },
    get headers() {
      return headers;
    },
  };
}

describe("response helpers", () => {
  describe("json", () => {
    it("sends JSON with correct content type", () => {
      const res = mockRes();
      json(res as never, 200, { ok: true });
      assert.strictEqual(res.status, 200);
      assert.strictEqual(res.headers["Content-Type"], "application/json; charset=utf-8");
      assert.deepStrictEqual(JSON.parse(res.body), { ok: true });
    });

    it("sends correct status code", () => {
      const res = mockRes();
      json(res as never, 404, { error: "Not found" });
      assert.strictEqual(res.status, 404);
    });
  });

  describe("html", () => {
    it("sends HTML with CSP header", () => {
      const res = mockRes();
      html(res as never, 200, "<h1>Test</h1>", "test-nonce");
      assert.strictEqual(res.status, 200);
      assert.ok(res.headers["Content-Type"]?.includes("text/html"));
      assert.ok(res.headers["Content-Security-Policy"]?.includes("nonce-test-nonce"));
      assert.ok(res.headers["Content-Security-Policy"]?.includes("default-src 'none'"));
      assert.ok(res.headers["Content-Security-Policy"]?.includes("frame-ancestors 'none'"));
    });
  });

  describe("redirect", () => {
    it("sends 302 redirect", () => {
      const res = mockRes();
      redirect(res as never, "/login");
      assert.strictEqual(res.status, 302);
      assert.strictEqual(res.headers.Location, "/login");
    });
  });
});

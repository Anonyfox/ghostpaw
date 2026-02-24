import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { createSessionToken, hashPassword } from "./auth.js";
import { createRequestHandler } from "./handler.js";
import { resetGeneralBuckets } from "./rate-limit.js";
import { createRouter } from "./router.js";

const TEST_HASH = hashPassword("test-handler-pw");

function mockRuntime() {
  return {
    workspace: "/tmp",
    model: "test",
    sessions: {} as never,
    memory: {} as never,
    secrets: {} as never,
    eventBus: {} as never,
    run: async () => "",
    stream: async function* () {},
    stop() {},
  };
}

function mockReq(method: string, url: string, headers: Record<string, string> = {}) {
  return {
    method,
    url,
    headers: { host: "localhost:3000", ...headers },
    socket: { remoteAddress: "127.0.0.1" },
  } as never;
}

function mockRes() {
  const hdrs: Record<string, string> = {};
  let statusCode = 0;
  let body = "";
  let headersSent = false;
  return {
    setHeader(k: string, v: string) {
      hdrs[k] = v;
    },
    writeHead(s: number, h: Record<string, string> = {}) {
      statusCode = s;
      Object.assign(hdrs, h);
      headersSent = true;
    },
    end(d?: string) {
      if (d) body = d;
    },
    get headersSent() {
      return headersSent;
    },
    get status() {
      return statusCode;
    },
    get body() {
      return body;
    },
    get headers() {
      return hdrs;
    },
  };
}

describe("handler", () => {
  it("returns 404 for unmatched routes", () => {
    resetGeneralBuckets();
    const router = createRouter();
    const handler = createRequestHandler({
      router,
      runtime: mockRuntime() as never,
      passwordHash: TEST_HASH,
      origin: "http://localhost:3000",
      isLocalhost: true,
    });
    const res = mockRes();
    handler.handle(mockReq("GET", "/missing"), res as never);
    assert.strictEqual(res.status, 404);
  });

  it("applies security headers", () => {
    resetGeneralBuckets();
    const router = createRouter();
    router.add(
      "GET",
      "/test",
      (_req, res) => {
        res.writeHead(200);
        res.end();
      },
      false,
    );
    const handler = createRequestHandler({
      router,
      runtime: mockRuntime() as never,
      passwordHash: TEST_HASH,
      origin: "http://localhost:3000",
      isLocalhost: true,
    });
    const res = mockRes();
    handler.handle(mockReq("GET", "/test"), res as never);
    assert.strictEqual(res.headers["X-Content-Type-Options"], "nosniff");
    assert.strictEqual(res.headers["X-Frame-Options"], "DENY");
  });

  it("rejects unauthenticated API requests with 401", () => {
    resetGeneralBuckets();
    const router = createRouter();
    router.add("GET", "/api/data", (_req, res) => {
      res.writeHead(200);
      res.end("ok");
    });
    const handler = createRequestHandler({
      router,
      runtime: mockRuntime() as never,
      passwordHash: TEST_HASH,
      origin: "http://localhost:3000",
      isLocalhost: true,
    });
    const res = mockRes();
    handler.handle(mockReq("GET", "/api/data"), res as never);
    assert.strictEqual(res.status, 401);
  });

  it("allows authenticated requests via cookie", () => {
    resetGeneralBuckets();
    const router = createRouter();
    let called = false;
    router.add("GET", "/api/data", (_req, res) => {
      called = true;
      res.writeHead(200);
      res.end("ok");
    });
    const handler = createRequestHandler({
      router,
      runtime: mockRuntime() as never,
      passwordHash: TEST_HASH,
      origin: "http://localhost:3000",
      isLocalhost: true,
    });
    const token = createSessionToken(TEST_HASH);
    const res = mockRes();
    handler.handle(
      mockReq("GET", "/api/data", { cookie: `ghostpaw_session=${token}` }),
      res as never,
    );
    assert.ok(called);
  });

  it("does not send HSTS on localhost", () => {
    resetGeneralBuckets();
    const router = createRouter();
    router.add(
      "GET",
      "/test",
      (_req, res) => {
        res.writeHead(200);
        res.end();
      },
      false,
    );
    const handler = createRequestHandler({
      router,
      runtime: mockRuntime() as never,
      passwordHash: TEST_HASH,
      origin: "http://localhost:3000",
      isLocalhost: true,
    });
    const res = mockRes();
    handler.handle(mockReq("GET", "/test"), res as never);
    assert.strictEqual(res.headers["Strict-Transport-Security"], undefined);
  });
});

import { strictEqual } from "node:assert/strict";
import type { IncomingMessage, ServerResponse } from "node:http";
import { describe, it } from "node:test";
import type { RouteContext } from "../types.ts";
import { createStaticHandlers } from "./static.ts";

function mockReq(headers: Record<string, string> = {}): IncomingMessage {
  return { headers } as IncomingMessage;
}

function mockRes(): ServerResponse & {
  _status: number;
  _headers: Map<string, string>;
  _body: string;
} {
  const res = {
    _status: 0,
    _headers: new Map<string, string>(),
    _body: "",
    writeHead(status: number, headers?: Record<string, string>) {
      res._status = status;
      if (headers) {
        for (const [k, v] of Object.entries(headers)) {
          res._headers.set(k.toLowerCase(), v);
        }
      }
      return res;
    },
    setHeader(name: string, value: string | string[]) {
      res._headers.set(name.toLowerCase(), Array.isArray(value) ? value.join(", ") : value);
      return res;
    },
    end(data?: string) {
      if (data) res._body = data;
    },
  } as unknown as ServerResponse & {
    _status: number;
    _headers: Map<string, string>;
    _body: string;
  };
  return res;
}

function ctx(req: IncomingMessage, res: ServerResponse): RouteContext {
  return { req, res, params: {} };
}

describe("serveAppJs", () => {
  it("serves JS with correct content type and caching headers", () => {
    const assets = {
      clientJs: "console.log('app');",
      bootstrapCss: "",
      bootId: "boot-123",
    };
    const handlers = createStaticHandlers(assets);
    const req = mockReq();
    const res = mockRes();
    handlers.serveAppJs(ctx(req, res));
    strictEqual(res._status, 200);
    strictEqual(res._headers.get("content-type"), "application/javascript; charset=utf-8");
    strictEqual(res._headers.get("cache-control"), "public, max-age=31536000, immutable");
    strictEqual(res._headers.get("etag"), "boot-123");
    strictEqual(res._body, "console.log('app');");
  });

  it("returns 304 when ETag matches", () => {
    const assets = {
      clientJs: "console.log('app');",
      bootstrapCss: "",
      bootId: "boot-123",
    };
    const handlers = createStaticHandlers(assets);
    const req = mockReq({ "if-none-match": "boot-123" });
    const res = mockRes();
    handlers.serveAppJs(ctx(req, res));
    strictEqual(res._status, 304);
    strictEqual(res._headers.get("etag"), "boot-123");
    strictEqual(res._body, "");
  });
});

describe("serveStyleCss", () => {
  it("serves CSS combining bootstrap + custom", () => {
    const assets = {
      clientJs: "",
      bootstrapCss: "body { margin: 0; }",
      customCss: ".custom { color: red; }",
      bootId: "boot-456",
    };
    const handlers = createStaticHandlers(assets);
    const req = mockReq();
    const res = mockRes();
    handlers.serveStyleCss(ctx(req, res));
    strictEqual(res._status, 200);
    strictEqual(res._headers.get("content-type"), "text/css; charset=utf-8");
    strictEqual(res._headers.get("cache-control"), "public, max-age=31536000, immutable");
    strictEqual(res._headers.get("etag"), "boot-456");
    strictEqual(res._body, "body { margin: 0; }\n.custom { color: red; }");
  });

  it("serves just bootstrap when no custom CSS", () => {
    const assets = {
      clientJs: "",
      bootstrapCss: "body { margin: 0; }",
      bootId: "boot-789",
    };
    const handlers = createStaticHandlers(assets);
    const req = mockReq();
    const res = mockRes();
    handlers.serveStyleCss(ctx(req, res));
    strictEqual(res._status, 200);
    strictEqual(res._body, "body { margin: 0; }\n");
  });

  it("returns 304 when ETag matches", () => {
    const assets = {
      clientJs: "",
      bootstrapCss: "body {}",
      bootId: "boot-abc",
    };
    const handlers = createStaticHandlers(assets);
    const req = mockReq({ "if-none-match": "boot-abc" });
    const res = mockRes();
    handlers.serveStyleCss(ctx(req, res));
    strictEqual(res._status, 304);
    strictEqual(res._headers.get("etag"), "boot-abc");
    strictEqual(res._body, "");
  });
});

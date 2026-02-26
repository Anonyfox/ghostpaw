import { strictEqual } from "node:assert/strict";
import type { IncomingMessage, ServerResponse } from "node:http";
import { describe, it } from "node:test";
import type { RouteContext } from "../types.ts";
import { createSpaHandler } from "./spa.ts";

function mockReq(): IncomingMessage {
  return {} as IncomingMessage;
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

function ctx(req: IncomingMessage, res: ServerResponse, nonce: string): RouteContext {
  return { req, res, params: {}, nonce };
}

describe("serveSpaShell", () => {
  it("serves HTML with correct content type", () => {
    const renderShellFn = (): string => "<html><body>app</body></html>";
    const handler = createSpaHandler(renderShellFn, "boot-xyz");
    const req = mockReq();
    const res = mockRes();
    handler(ctx(req, res, ""));
    strictEqual(res._status, 200);
    strictEqual(res._headers.get("content-type"), "text/html; charset=utf-8");
    strictEqual(res._body, "<html><body>app</body></html>");
  });

  it("passes the context's nonce to the render function", () => {
    const renderShellFn = (nonce: string): string => `<script nonce="${nonce}">`;
    const handler = createSpaHandler(renderShellFn, "boot-xyz");
    const req = mockReq();
    const res = mockRes();
    handler(ctx(req, res, "abc123nonce"));
    strictEqual(res._body, '<script nonce="abc123nonce">');
  });

  it("sets no-cache header (CSP nonces change per request)", () => {
    const renderShellFn = (): string => "<html></html>";
    const handler = createSpaHandler(renderShellFn, "boot-xyz");
    const req = mockReq();
    const res = mockRes();
    handler(ctx(req, res, ""));
    strictEqual(res._headers.get("cache-control"), "no-cache");
  });
});

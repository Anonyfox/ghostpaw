import { deepStrictEqual, strictEqual } from "node:assert/strict";
import type { IncomingMessage, ServerResponse } from "node:http";
import { Readable } from "node:stream";
import { before, describe, it } from "node:test";
import { createSessionToken } from "../create_session_token.ts";
import { hashPassword } from "../hash_password.ts";
import { createAuthHandlers } from "./auth.ts";

function mockReq(body: object, headers: Record<string, string> = {}): IncomingMessage {
  const json = JSON.stringify(body);
  const req = Readable.from([json]) as IncomingMessage;
  req.headers = { "content-type": "application/json", ...headers };
  return req;
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

const TEST_PASSWORD = "ghostpaw-test-pw";

describe("auth handlers", () => {
  let passwordHash: string;
  let handlers: ReturnType<typeof createAuthHandlers>;

  before(async () => {
    passwordHash = await hashPassword(TEST_PASSWORD);
    handlers = createAuthHandlers({ passwordHash, secure: false });
  });

  describe("login", () => {
    it("correct password sets cookie and returns 200", async () => {
      const req = mockReq({ password: TEST_PASSWORD });
      const res = mockRes();
      await handlers.login({ req, res, params: {} });
      strictEqual(res._status, 200);
      deepStrictEqual(JSON.parse(res._body), { ok: true });
      strictEqual(res._headers.has("set-cookie"), true);
      strictEqual(res._headers.get("set-cookie")!.includes("ghostpaw_session="), true);
    });

    it("wrong password returns 401", async () => {
      const req = mockReq({ password: "wrong" });
      const res = mockRes();
      await handlers.login({ req, res, params: {} });
      strictEqual(res._status, 401);
      deepStrictEqual(JSON.parse(res._body), { error: "Invalid password." });
    });

    it("missing password field returns 400", async () => {
      const req = mockReq({ username: "admin" });
      const res = mockRes();
      await handlers.login({ req, res, params: {} });
      strictEqual(res._status, 400);
      deepStrictEqual(JSON.parse(res._body), { error: "Missing password field." });
    });

    it("non-JSON content type returns error", async () => {
      const json = JSON.stringify({ password: TEST_PASSWORD });
      const req = Readable.from([json]) as IncomingMessage;
      req.headers = { "content-type": "text/plain" };
      const res = mockRes();
      await handlers.login({ req, res, params: {} });
      strictEqual(res._status, 400);
    });
  });

  describe("logout", () => {
    it("clears cookie and returns 200", async () => {
      const req = mockReq({});
      const res = mockRes();
      await handlers.logout({ req, res, params: {} });
      strictEqual(res._status, 200);
      deepStrictEqual(JSON.parse(res._body), { ok: true });
      strictEqual(res._headers.has("set-cookie"), true);
      strictEqual(res._headers.get("set-cookie")!.includes("Max-Age=0"), true);
    });
  });

  describe("checkSession", () => {
    it("returns true for valid token", () => {
      const token = createSessionToken(passwordHash);
      const req = mockReq({}, { cookie: `ghostpaw_session=${token}` });
      const res = mockRes();
      strictEqual(handlers.checkSession({ req, res, params: {} }), true);
    });

    it("returns false for missing cookie", () => {
      const req = mockReq({});
      req.headers = { "content-type": "application/json" };
      const res = mockRes();
      strictEqual(handlers.checkSession({ req, res, params: {} }), false);
    });

    it("returns false for invalid token", () => {
      const req = mockReq({}, { cookie: "ghostpaw_session=bogus.token" });
      const res = mockRes();
      strictEqual(handlers.checkSession({ req, res, params: {} }), false);
    });
  });
});

import { ok, strictEqual } from "node:assert/strict";
import type { IncomingMessage } from "node:http";
import { Readable } from "node:stream";
import { afterEach, beforeEach, describe, it } from "node:test";
import { getConfig, initConfigTable, setConfig } from "../../../../core/config/index.ts";
import { initSecretsTable } from "../../../../core/secrets/index.ts";
import type { DatabaseHandle } from "../../../../lib/database.ts";
import { openTestDatabase } from "../../../../lib/database.ts";
import type { RouteContext } from "../types.ts";
import { createModelsApiHandlers } from "./models_api.ts";

function mockReq(body?: object): IncomingMessage {
  if (body !== undefined) {
    const json = JSON.stringify(body);
    const req = Readable.from([json]) as IncomingMessage;
    req.headers = { "content-type": "application/json" };
    return req;
  }
  const req = Readable.from([]) as IncomingMessage;
  req.headers = {};
  return req;
}

function mockRes() {
  let _status = 0;
  let _body = "";
  const _headers = new Map<string, string>();
  return {
    setHeader(name: string, value: string) {
      _headers.set(name, value);
    },
    writeHead(status: number, hdrs?: Record<string, string>) {
      _status = status;
      if (hdrs) for (const [k, v] of Object.entries(hdrs)) _headers.set(k, v);
    },
    end(body?: string) {
      _body = body ?? "";
    },
    get status() {
      return _status;
    },
    get body() {
      return _body;
    },
  };
}

function ctx(
  req: IncomingMessage,
  res: ReturnType<typeof mockRes>,
  params: Record<string, string> = {},
): RouteContext {
  return { req, res: res as never, params, nonce: "test" };
}

describe("models API", () => {
  let db: DatabaseHandle;
  let handlers: ReturnType<typeof createModelsApiHandlers>;
  const savedEnv: Record<string, string | undefined> = {};

  beforeEach(async () => {
    db = await openTestDatabase();
    initSecretsTable(db);
    initConfigTable(db);
    handlers = createModelsApiHandlers(db);
    for (const key of ["API_KEY_ANTHROPIC", "API_KEY_OPENAI", "API_KEY_XAI"]) {
      savedEnv[key] = process.env[key];
    }
  });

  afterEach(() => {
    db.close();
    for (const [key, val] of Object.entries(savedEnv)) {
      if (val === undefined) delete process.env[key];
      else process.env[key] = val;
    }
  });

  describe("list", () => {
    it("returns currentModel and three providers", async () => {
      const res = mockRes();
      await handlers.list(ctx(mockReq(), res));
      strictEqual(res.status, 200);
      const data = JSON.parse(res.body);
      strictEqual(data.currentModel, "claude-sonnet-4-6");
      strictEqual(data.currentProvider, "anthropic");
      ok(Array.isArray(data.providers));
      strictEqual(data.providers.length, 3);
    });

    it("reflects overridden model in response", async () => {
      setConfig(db, "default_model", "gpt-4o", "web");
      const res = mockRes();
      await handlers.list(ctx(mockReq(), res));
      const data = JSON.parse(res.body);
      strictEqual(data.currentModel, "gpt-4o");
      strictEqual(data.currentProvider, "openai");
    });

    it("returns null currentProvider for unknown model", async () => {
      setConfig(db, "default_model", "mystery-model", "web");
      const res = mockRes();
      await handlers.list(ctx(mockReq(), res));
      const data = JSON.parse(res.body);
      strictEqual(data.currentProvider, null);
    });
  });

  describe("set", () => {
    it("sets model when provider is active", async () => {
      process.env.API_KEY_OPENAI = "sk-test";
      const res = mockRes();
      await handlers.set(ctx(mockReq({ model: "gpt-4o" }), res));
      strictEqual(res.status, 200);
      const data = JSON.parse(res.body);
      strictEqual(data.ok, true);
      strictEqual(data.model, "gpt-4o");
      strictEqual(data.provider, "openai");
      strictEqual(getConfig(db, "default_model"), "gpt-4o");
    });

    it("rejects unknown model", async () => {
      const res = mockRes();
      await handlers.set(ctx(mockReq({ model: "not-a-real-model" }), res));
      strictEqual(res.status, 400);
      ok(JSON.parse(res.body).error.includes("Unknown model"));
    });

    it("rejects model when provider has no key", async () => {
      delete process.env.API_KEY_OPENAI;
      const res = mockRes();
      await handlers.set(ctx(mockReq({ model: "gpt-4o" }), res));
      strictEqual(res.status, 400);
      ok(JSON.parse(res.body).error.includes("not active"));
    });

    it("rejects missing model field", async () => {
      const res = mockRes();
      await handlers.set(ctx(mockReq({}), res));
      strictEqual(res.status, 400);
    });

    it("rejects empty model string", async () => {
      const res = mockRes();
      await handlers.set(ctx(mockReq({ model: "  " }), res));
      strictEqual(res.status, 400);
    });

    it("rejects invalid request body", async () => {
      const req = Readable.from(["not json"]) as IncomingMessage;
      req.headers = { "content-type": "application/json" };
      const res = mockRes();
      await handlers.set(ctx(req, res));
      strictEqual(res.status, 400);
    });

    it("trims whitespace from model name", async () => {
      process.env.API_KEY_ANTHROPIC = "sk-test";
      const res = mockRes();
      await handlers.set(ctx(mockReq({ model: " claude-sonnet-4-6 " }), res));
      strictEqual(res.status, 200);
      strictEqual(getConfig(db, "default_model"), "claude-sonnet-4-6");
    });
  });
});

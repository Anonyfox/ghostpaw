import { deepStrictEqual, ok, strictEqual } from "node:assert/strict";
import type { IncomingMessage } from "node:http";
import { Readable } from "node:stream";
import { afterEach, before, beforeEach, describe, it } from "node:test";
import { setSecret } from "../../../../core/secrets/api/write/index.ts";
import { initSecretsTable } from "../../../../core/secrets/runtime/index.ts";
import type { DatabaseHandle } from "../../../../lib/index.ts";
import { openTestDatabase } from "../../../../lib/index.ts";
import type { RouteContext } from "../types.ts";
import { createSecretsApiHandlers } from "./secrets_api.ts";

function mockReq(body?: object, headers: Record<string, string> = {}): IncomingMessage {
  if (body !== undefined) {
    const json = JSON.stringify(body);
    const req = Readable.from([json]) as IncomingMessage;
    req.headers = { "content-type": "application/json", ...headers };
    return req;
  }
  const req = Readable.from([]) as IncomingMessage;
  req.headers = headers;
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
    get headers() {
      return _headers;
    },
  };
}

function ctx(
  req: IncomingMessage,
  res: ReturnType<typeof mockRes>,
  params: Record<string, string> = {},
): RouteContext {
  return { req, res: res as never, params };
}

describe("secrets API", () => {
  let db: DatabaseHandle;
  let handlers: ReturnType<typeof createSecretsApiHandlers>;
  const savedEnv: Record<string, string | undefined> = {};
  const ENV_KEYS = [
    "API_KEY_ANTHROPIC",
    "ANTHROPIC_API_KEY",
    "API_KEY_OPENAI",
    "OPENAI_API_KEY",
    "BRAVE_API_KEY",
  ];

  before(async () => {
    for (const k of ENV_KEYS) savedEnv[k] = process.env[k];
  });

  beforeEach(async () => {
    for (const k of ENV_KEYS) delete process.env[k];
    db = await openTestDatabase();
    initSecretsTable(db);
    handlers = createSecretsApiHandlers(db);
  });

  afterEach(() => {
    db.close();
    for (const k of ENV_KEYS) {
      if (savedEnv[k] !== undefined) process.env[k] = savedEnv[k];
      else delete process.env[k];
    }
  });

  describe("list", () => {
    it("returns all known keys with configured status", () => {
      setSecret(db, "ANTHROPIC_API_KEY", "sk-ant-test123");

      const res = mockRes();
      handlers.list(ctx(mockReq(), res));

      strictEqual(res.status, 200);
      const data = JSON.parse(res.body);
      ok(Array.isArray(data.secrets));

      const anthropic = data.secrets.find((s: { key: string }) => s.key === "API_KEY_ANTHROPIC");
      ok(anthropic, "Anthropic key present");
      strictEqual(anthropic.configured, true);
      strictEqual(anthropic.category, "llm");
      strictEqual(anthropic.label, "Anthropic");

      const openai = data.secrets.find((s: { key: string }) => s.key === "API_KEY_OPENAI");
      ok(openai, "OpenAI key present");
      strictEqual(openai.configured, false);
    });

    it("marks the active search provider", () => {
      setSecret(db, "BRAVE_API_KEY", "brave-test-key");

      const res = mockRes();
      handlers.list(ctx(mockReq(), res));

      const data = JSON.parse(res.body);
      const brave = data.secrets.find((s: { key: string }) => s.key === "BRAVE_API_KEY");
      strictEqual(brave.isActiveSearch, true);

      const tavily = data.secrets.find((s: { key: string }) => s.key === "TAVILY_API_KEY");
      strictEqual(tavily.isActiveSearch, false);
    });

    it("includes custom keys from the database", () => {
      setSecret(db, "MY_CUSTOM_KEY", "custom-value");

      const res = mockRes();
      handlers.list(ctx(mockReq(), res));

      const data = JSON.parse(res.body);
      const custom = data.secrets.find((s: { key: string }) => s.key === "MY_CUSTOM_KEY");
      ok(custom, "custom key present");
      strictEqual(custom.category, "custom");
      strictEqual(custom.configured, true);
    });

    it("excludes WEB_UI_ prefixed keys from the list", () => {
      db.prepare("INSERT INTO secrets (key, value, updated_at) VALUES (?, ?, ?)").run(
        "WEB_UI_PASSWORD",
        "hashed-pw",
        Date.now(),
      );

      const res = mockRes();
      handlers.list(ctx(mockReq(), res));

      const data = JSON.parse(res.body);
      const webUi = data.secrets.find((s: { key: string }) => s.key === "WEB_UI_PASSWORD");
      strictEqual(webUi, undefined, "WEB_UI_PASSWORD excluded");
    });

    it("returns empty configured state when no secrets are set", () => {
      const res = mockRes();
      handlers.list(ctx(mockReq(), res));

      const data = JSON.parse(res.body);
      const configured = data.secrets.filter((s: { configured: boolean }) => s.configured);
      strictEqual(configured.length, 0);
    });
  });

  describe("set", () => {
    it("stores a secret and returns ok", async () => {
      const res = mockRes();
      await handlers.set(ctx(mockReq({ key: "ANTHROPIC_API_KEY", value: "sk-ant-test" }), res));

      strictEqual(res.status, 200);
      deepStrictEqual(JSON.parse(res.body), { ok: true });

      const listRes = mockRes();
      handlers.list(ctx(mockReq(), listRes));
      const data = JSON.parse(listRes.body);
      const anthropic = data.secrets.find((s: { key: string }) => s.key === "API_KEY_ANTHROPIC");
      strictEqual(anthropic.configured, true);
    });

    it("returns warning for mismatched key prefix", async () => {
      const res = mockRes();
      await handlers.set(ctx(mockReq({ key: "ANTHROPIC_API_KEY", value: "sk-openai-test" }), res));

      strictEqual(res.status, 200);
      const data = JSON.parse(res.body);
      strictEqual(data.ok, true);
      ok(data.warning, "warning is present");
    });

    it("rejects empty value", async () => {
      const res = mockRes();
      await handlers.set(ctx(mockReq({ key: "ANTHROPIC_API_KEY", value: "   " }), res));

      strictEqual(res.status, 400);
      ok(JSON.parse(res.body).error);
    });

    it("rejects missing key field", async () => {
      const res = mockRes();
      await handlers.set(ctx(mockReq({ value: "test" }), res));

      strictEqual(res.status, 400);
    });

    it("rejects missing value field", async () => {
      const res = mockRes();
      await handlers.set(ctx(mockReq({ key: "MY_KEY" }), res));

      strictEqual(res.status, 400);
    });

    it("rejects non-JSON content type", async () => {
      const req = Readable.from(['"test"']) as IncomingMessage;
      req.headers = { "content-type": "text/plain" };
      const res = mockRes();
      await handlers.set(ctx(req, res));

      strictEqual(res.status, 400);
    });

    it("allows WEB_UI_ prefixed keys from web API", async () => {
      const res = mockRes();
      await handlers.set(ctx(mockReq({ key: "WEB_UI_PASSWORD", value: "new-pass" }), res));

      strictEqual(res.status, 200);
    });

    it("updates an existing secret", async () => {
      setSecret(db, "ANTHROPIC_API_KEY", "sk-ant-old");

      const res = mockRes();
      await handlers.set(ctx(mockReq({ key: "ANTHROPIC_API_KEY", value: "sk-ant-new" }), res));

      strictEqual(res.status, 200);
      strictEqual(process.env.API_KEY_ANTHROPIC, "sk-ant-new");
    });
  });

  describe("remove", () => {
    it("deletes an existing secret", () => {
      setSecret(db, "ANTHROPIC_API_KEY", "sk-ant-test");

      const res = mockRes();
      handlers.remove(ctx(mockReq(), res, { key: "API_KEY_ANTHROPIC" }));

      strictEqual(res.status, 200);
      deepStrictEqual(JSON.parse(res.body), { ok: true });

      const listRes = mockRes();
      handlers.list(ctx(mockReq(), listRes));
      const data = JSON.parse(listRes.body);
      const anthropic = data.secrets.find((s: { key: string }) => s.key === "API_KEY_ANTHROPIC");
      strictEqual(anthropic.configured, false);
    });

    it("succeeds silently for non-existent key", () => {
      const res = mockRes();
      handlers.remove(ctx(mockReq(), res, { key: "NONEXISTENT" }));

      strictEqual(res.status, 200);
      deepStrictEqual(JSON.parse(res.body), { ok: true });
    });

    it("uses the key from URL params", () => {
      setSecret(db, "BRAVE_API_KEY", "brave-test");

      const res = mockRes();
      handlers.remove(ctx(mockReq(), res, { key: "BRAVE_API_KEY" }));

      strictEqual(res.status, 200);
      strictEqual(process.env.BRAVE_API_KEY, undefined);
    });

    it("allows removing WEB_UI_ prefixed keys from web API", () => {
      db.prepare("INSERT INTO secrets (key, value, updated_at) VALUES (?, ?, ?)").run(
        "WEB_UI_PASSWORD_HASH",
        "real-hash",
        Date.now(),
      );

      const res = mockRes();
      handlers.remove(ctx(mockReq(), res, { key: "WEB_UI_PASSWORD_HASH" }));

      strictEqual(res.status, 200);
    });
  });
});

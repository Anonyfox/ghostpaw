import assert from "node:assert/strict";
import { afterEach, beforeEach, describe, it } from "node:test";
import { initSecretsTable } from "../../../../core/secrets/runtime/index.ts";
import { setSecret } from "../../../../core/secrets/set_secret.ts";
import type { DatabaseHandle } from "../../../../lib/index.ts";
import { openTestDatabase } from "../../../../lib/index.ts";
import { createSetupApiHandlers } from "./setup_api.ts";

function mockCtx(overrides?: { body?: string; contentType?: string }) {
  let statusCode = 0;
  let responseBody = "";
  const res = {
    writeHead(status: number, _headers: Record<string, string>) {
      statusCode = status;
    },
    end(data: string) {
      responseBody = data;
    },
  };

  const bodyStr = overrides?.body ?? "";
  const chunks = bodyStr ? [Buffer.from(bodyStr)] : [];
  const req = {
    headers: { "content-type": overrides?.contentType ?? "application/json" },
    [Symbol.asyncIterator]: async function* () {
      for (const chunk of chunks) yield chunk;
    },
  };

  return {
    ctx: { req: req as never, res: res as never, params: {} },
    status: () => statusCode,
    body: () => JSON.parse(responseBody),
  };
}

describe("setup_api", () => {
  let db: DatabaseHandle;

  beforeEach(async () => {
    db = await openTestDatabase();
    initSecretsTable(db);
  });

  afterEach(() => {
    db.close();
  });

  describe("status", () => {
    it("returns hasLlmKey: false on empty DB", () => {
      const handlers = createSetupApiHandlers(db);
      const mock = mockCtx();
      handlers.status(mock.ctx);
      assert.equal(mock.status(), 200);
      assert.equal(mock.body().hasLlmKey, false);
      assert.equal(mock.body().hasSearchKey, false);
    });

    it("returns hasLlmKey: true when an LLM key is configured", () => {
      setSecret(db, "API_KEY_ANTHROPIC", "test-key-value");
      process.env.API_KEY_ANTHROPIC = "test-key-value";
      const handlers = createSetupApiHandlers(db);
      const mock = mockCtx();
      handlers.status(mock.ctx);
      assert.equal(mock.status(), 200);
      assert.equal(mock.body().hasLlmKey, true);
      delete process.env.API_KEY_ANTHROPIC;
    });
  });

  describe("testKey", () => {
    it("rejects invalid provider", async () => {
      const handlers = createSetupApiHandlers(db);
      const mock = mockCtx({ body: JSON.stringify({ provider: "invalid", key: "abc" }) });
      await handlers.testKey(mock.ctx);
      assert.equal(mock.status(), 400);
      assert.ok(mock.body().error.includes("Invalid provider"));
    });

    it("rejects missing key", async () => {
      const handlers = createSetupApiHandlers(db);
      const mock = mockCtx({ body: JSON.stringify({ provider: "anthropic", key: "" }) });
      await handlers.testKey(mock.ctx);
      assert.equal(mock.status(), 400);
      assert.ok(mock.body().error.includes("Missing API key"));
    });
  });

  describe("envCheck", () => {
    it("returns platform and checks array", async () => {
      const handlers = createSetupApiHandlers(db);
      const mock = mockCtx();
      await handlers.envCheck(mock.ctx);
      assert.equal(mock.status(), 200);
      assert.ok(typeof mock.body().platform === "string");
      assert.ok(Array.isArray(mock.body().checks));
      assert.ok(mock.body().checks.length > 0);
    });
  });
});

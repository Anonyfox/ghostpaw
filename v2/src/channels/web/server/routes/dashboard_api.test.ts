import { ok, strictEqual } from "node:assert/strict";
import { afterEach, beforeEach, describe, it } from "node:test";
import { initSecretsTable, setSecret } from "../../../../core/secrets/index.ts";
import type { DatabaseHandle } from "../../../../lib/index.ts";
import { openTestDatabase } from "../../../../lib/index.ts";
import type { RouteContext } from "../types.ts";
import { createDashboardHandler } from "./dashboard_api.ts";

function mockRes() {
  let _status = 0;
  let _body = "";
  const headers = new Map<string, string>();
  return {
    setHeader(name: string, value: string) {
      headers.set(name, value);
    },
    writeHead(status: number, hdrs?: Record<string, string>) {
      _status = status;
      if (hdrs) for (const [k, v] of Object.entries(hdrs)) headers.set(k, v);
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
      return headers;
    },
  };
}

describe("dashboard API", () => {
  let db: DatabaseHandle;

  beforeEach(async () => {
    db = await openTestDatabase();
    initSecretsTable(db);
  });

  afterEach(() => {
    db.close();
  });

  it("returns 200 with JSON content type", () => {
    const res = mockRes();
    const ctx = { req: {}, res, params: {} } as unknown as RouteContext;
    const handler = createDashboardHandler({ version: "1.0.0", db });
    handler(ctx);
    strictEqual(res.status, 200);
    strictEqual(res.headers.get("Content-Type"), "application/json");
  });

  it("response includes version from config", () => {
    const res = mockRes();
    const ctx = { req: {}, res, params: {} } as unknown as RouteContext;
    const handler = createDashboardHandler({ version: "2.3.4", db });
    handler(ctx);
    const data = JSON.parse(res.body);
    strictEqual(data.version, "2.3.4");
  });

  it("response includes uptimeMs as a number > 0", () => {
    const res = mockRes();
    const ctx = { req: {}, res, params: {} } as unknown as RouteContext;
    const handler = createDashboardHandler({ version: "1.0.0", db });
    handler(ctx);
    const data = JSON.parse(res.body);
    strictEqual(typeof data.uptimeMs, "number");
    ok(data.uptimeMs > 0);
  });

  it("secretsCount reflects the number of secrets in the database", () => {
    setSecret(db, "API_KEY_ANTHROPIC", "sk-ant-test");
    setSecret(db, "API_KEY_OPENAI", "sk-openai-test");

    const res = mockRes();
    const ctx = { req: {}, res, params: {} } as unknown as RouteContext;
    const handler = createDashboardHandler({ version: "1.0.0", db });
    handler(ctx);
    const data = JSON.parse(res.body);
    strictEqual(data.secretsCount, 2);
  });

  it("secretsCount is zero when no secrets exist", () => {
    const res = mockRes();
    const ctx = { req: {}, res, params: {} } as unknown as RouteContext;
    const handler = createDashboardHandler({ version: "1.0.0", db });
    handler(ctx);
    const data = JSON.parse(res.body);
    strictEqual(data.secretsCount, 0);
  });
});

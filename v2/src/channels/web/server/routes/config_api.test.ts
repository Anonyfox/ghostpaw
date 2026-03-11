import { deepStrictEqual, ok, strictEqual } from "node:assert/strict";
import type { IncomingMessage } from "node:http";
import { Readable } from "node:stream";
import { afterEach, beforeEach, describe, it } from "node:test";
import { getConfig } from "../../../../core/config/api/read/index.ts";
import { setConfig } from "../../../../core/config/api/write/index.ts";
import { initConfigTable } from "../../../../core/config/runtime/index.ts";
import type { DatabaseHandle } from "../../../../lib/index.ts";
import { openTestDatabase } from "../../../../lib/index.ts";
import type { ConfigInfo } from "../../shared/config_types.ts";
import type { RouteContext } from "../types.ts";
import { createConfigApiHandlers } from "./config_api.ts";

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

describe("config API", () => {
  let db: DatabaseHandle;
  let handlers: ReturnType<typeof createConfigApiHandlers>;

  beforeEach(async () => {
    db = await openTestDatabase();
    initConfigTable(db);
    handlers = createConfigApiHandlers(db);
  });

  afterEach(() => {
    db.close();
  });

  describe("list", () => {
    it("returns all known key defaults with isDefault=true", () => {
      const res = mockRes();
      handlers.list(ctx(mockReq(), res));
      strictEqual(res.status, 200);
      const data = JSON.parse(res.body);
      ok(Array.isArray(data.config));
      const model = data.config.find((c: ConfigInfo) => c.key === "default_model");
      ok(model);
      strictEqual(model.isDefault, true);
      strictEqual(model.source, "default");
      strictEqual(model.label, "Default Model");
    });

    it("shows overridden values with isDefault=false", () => {
      setConfig(db, "default_model", "gpt-4o", "web");
      const res = mockRes();
      handlers.list(ctx(mockReq(), res));
      const data = JSON.parse(res.body);
      const model = data.config.find((c: ConfigInfo) => c.key === "default_model");
      strictEqual(model.isDefault, false);
      strictEqual(model.source, "web");
      ok(model.value.includes("gpt-4o"));
    });

    it("includes custom keys", () => {
      setConfig(db, "my_flag", true, "cli", "boolean");
      const res = mockRes();
      handlers.list(ctx(mockReq(), res));
      const data = JSON.parse(res.body);
      const custom = data.config.find((c: ConfigInfo) => c.key === "my_flag");
      ok(custom);
      strictEqual(custom.category, "custom");
      strictEqual(custom.isDefault, false);
    });
  });

  describe("set", () => {
    it("stores a known key value and returns ok", async () => {
      const res = mockRes();
      await handlers.set(ctx(mockReq({ key: "default_model", value: "gpt-4o" }), res));
      strictEqual(res.status, 200);
      deepStrictEqual(JSON.parse(res.body), { ok: true });
      strictEqual(getConfig(db, "default_model"), "gpt-4o");
    });

    it("stores a known integer key", async () => {
      const res = mockRes();
      await handlers.set(ctx(mockReq({ key: "compaction_threshold", value: "50000" }), res));
      strictEqual(res.status, 200);
      strictEqual(getConfig(db, "compaction_threshold"), 50000);
    });

    it("stores a custom key with explicit type", async () => {
      const res = mockRes();
      await handlers.set(ctx(mockReq({ key: "my_flag", value: "true", type: "boolean" }), res));
      strictEqual(res.status, 200);
      strictEqual(getConfig(db, "my_flag"), true);
    });

    it("infers type for custom keys without explicit type", async () => {
      const res = mockRes();
      await handlers.set(ctx(mockReq({ key: "batch_size", value: "32" }), res));
      strictEqual(res.status, 200);
      strictEqual(getConfig(db, "batch_size"), 32);
    });

    it("rejects type mismatch for known key", async () => {
      const res = mockRes();
      await handlers.set(ctx(mockReq({ key: "max_cost_per_day", value: "banana" }), res));
      strictEqual(res.status, 400);
      ok(JSON.parse(res.body).error.includes("number"));
    });

    it("rejects constraint violation for known key", async () => {
      const res = mockRes();
      await handlers.set(ctx(mockReq({ key: "warn_at_percentage", value: "150" }), res));
      strictEqual(res.status, 400);
      ok(JSON.parse(res.body).error);
    });

    it("rejects missing key", async () => {
      const res = mockRes();
      await handlers.set(ctx(mockReq({ value: "test" }), res));
      strictEqual(res.status, 400);
    });

    it("rejects missing value", async () => {
      const res = mockRes();
      await handlers.set(ctx(mockReq({ key: "my_key" }), res));
      strictEqual(res.status, 400);
    });

    it("rejects non-JSON content type", async () => {
      const req = Readable.from(['"test"']) as IncomingMessage;
      req.headers = { "content-type": "text/plain" };
      const res = mockRes();
      await handlers.set(ctx(req, res));
      strictEqual(res.status, 400);
    });
  });

  describe("undo", () => {
    it("undoes the last change", () => {
      setConfig(db, "max_cost_per_day", 5, "web");
      setConfig(db, "max_cost_per_day", 10, "web");
      const res = mockRes();
      handlers.undo(ctx(mockReq(), res, { key: "max_cost_per_day" }));
      strictEqual(res.status, 200);
      deepStrictEqual(JSON.parse(res.body), { ok: true });
      strictEqual(getConfig(db, "max_cost_per_day"), 5);
    });

    it("returns error when no history exists", () => {
      const res = mockRes();
      handlers.undo(ctx(mockReq(), res, { key: "default_model" }));
      strictEqual(res.status, 400);
      ok(JSON.parse(res.body).error.includes("no change history"));
    });

    it("returns error for empty key", () => {
      const res = mockRes();
      handlers.undo(ctx(mockReq(), res, { key: "" }));
      strictEqual(res.status, 400);
    });
  });

  describe("reset", () => {
    it("deletes all entries for a key", () => {
      setConfig(db, "default_model", "a", "web");
      setConfig(db, "default_model", "b", "web");
      const res = mockRes();
      handlers.reset(ctx(mockReq(), res, { key: "default_model" }));
      strictEqual(res.status, 200);
      deepStrictEqual(JSON.parse(res.body), { ok: true });
      strictEqual(getConfig(db, "default_model"), "claude-sonnet-4-6");
    });

    it("succeeds silently for key with no entries", () => {
      const res = mockRes();
      handlers.reset(ctx(mockReq(), res, { key: "default_model" }));
      strictEqual(res.status, 200);
    });

    it("returns error for empty key", () => {
      const res = mockRes();
      handlers.reset(ctx(mockReq(), res, { key: "" }));
      strictEqual(res.status, 400);
    });
  });
});

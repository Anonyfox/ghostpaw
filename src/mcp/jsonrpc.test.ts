import { deepStrictEqual, ok, strictEqual, throws } from "node:assert";
import { afterEach, beforeEach, describe, it } from "node:test";

import {
  createNotification,
  createRequest,
  isErrorResponse,
  isJsonRpcMessage,
  parseResponse,
  parseSSEData,
  resetIdCounter,
} from "./jsonrpc.js";

beforeEach(() => resetIdCounter());
afterEach(() => resetIdCounter());

describe("createRequest", () => {
  it("builds a valid JSON-RPC request with incrementing ids", () => {
    const a = createRequest("initialize", { protocolVersion: "2024-11-05" });
    strictEqual(a.id, 1);
    strictEqual(a.msg.jsonrpc, "2.0");
    strictEqual(a.msg.method, "initialize");
    deepStrictEqual(a.msg.params, { protocolVersion: "2024-11-05" });

    const b = createRequest("tools/list");
    strictEqual(b.id, 2);
    strictEqual(b.msg.params, undefined);
  });
});

describe("createNotification", () => {
  it("builds a notification without id", () => {
    const n = createNotification("notifications/initialized");
    strictEqual(n.jsonrpc, "2.0");
    strictEqual(n.method, "notifications/initialized");
    strictEqual((n as Record<string, unknown>).id, undefined);
  });
});

describe("isJsonRpcMessage", () => {
  it("accepts valid JSON-RPC", () => {
    ok(isJsonRpcMessage('{"jsonrpc":"2.0","id":1,"result":{}}'));
  });

  it("rejects non-JSON", () => {
    ok(!isJsonRpcMessage("not json"));
    ok(!isJsonRpcMessage(""));
    ok(!isJsonRpcMessage("  "));
  });

  it("rejects JSON without jsonrpc field", () => {
    ok(!isJsonRpcMessage('{"id":1,"result":{}}'));
  });

  it("rejects JSON with wrong jsonrpc version", () => {
    ok(!isJsonRpcMessage('{"jsonrpc":"1.0","id":1}'));
  });

  it("handles stderr noise lines", () => {
    ok(!isJsonRpcMessage("Warning: something happened"));
    ok(!isJsonRpcMessage("[INFO] Server starting..."));
  });
});

describe("parseResponse", () => {
  it("parses a success response", () => {
    const r = parseResponse('{"jsonrpc":"2.0","id":1,"result":{"tools":[]}}');
    ok(!isErrorResponse(r));
    strictEqual(r.id, 1);
    deepStrictEqual((r as { result: unknown }).result, { tools: [] });
  });

  it("parses an error response", () => {
    const r = parseResponse(
      '{"jsonrpc":"2.0","id":1,"error":{"code":-32600,"message":"Invalid Request"}}',
    );
    ok(isErrorResponse(r));
    strictEqual(r.error.code, -32600);
    strictEqual(r.error.message, "Invalid Request");
  });

  it("throws on invalid JSON", () => {
    throws(() => parseResponse("not json"), /Invalid JSON/);
  });

  it("throws on non-object", () => {
    throws(() => parseResponse("[]"), /must be an object/);
    throws(() => parseResponse('"hello"'), /must be an object/);
  });

  it("throws on wrong jsonrpc version", () => {
    throws(
      () => parseResponse('{"jsonrpc":"1.0","id":1,"result":{}}'),
      /Invalid jsonrpc version/,
    );
  });

  it("throws when missing both result and error", () => {
    throws(
      () => parseResponse('{"jsonrpc":"2.0","id":1}'),
      /missing both result and error/,
    );
  });

  it("throws on malformed error object", () => {
    throws(
      () =>
        parseResponse(
          '{"jsonrpc":"2.0","id":1,"error":{"code":"wrong","message":123}}',
        ),
      /Malformed JSON-RPC error/,
    );
  });
});

describe("parseSSEData", () => {
  it("extracts data lines from SSE text", () => {
    const input = [
      'data: {"jsonrpc":"2.0","id":1,"result":{}}',
      "",
      'data: {"jsonrpc":"2.0","id":2,"result":[]}',
    ].join("\n");
    const results = parseSSEData(input);
    strictEqual(results.length, 2);
    ok(results[0].includes('"id":1'));
    ok(results[1].includes('"id":2'));
  });

  it("ignores comments and non-data lines", () => {
    const input = [
      ": this is a comment",
      "event: message",
      'data: {"jsonrpc":"2.0","id":1,"result":"ok"}',
      "id: 42",
    ].join("\n");
    const results = parseSSEData(input);
    strictEqual(results.length, 1);
  });

  it("handles empty data fields", () => {
    const results = parseSSEData("data:\ndata:   \n");
    strictEqual(results.length, 0);
  });

  it("handles empty input", () => {
    deepStrictEqual(parseSSEData(""), []);
  });
});

describe("isErrorResponse", () => {
  it("identifies error responses", () => {
    const err = parseResponse(
      '{"jsonrpc":"2.0","id":1,"error":{"code":-1,"message":"fail"}}',
    );
    ok(isErrorResponse(err));
  });

  it("identifies success responses", () => {
    const ok_ = parseResponse('{"jsonrpc":"2.0","id":1,"result":"done"}');
    ok(!isErrorResponse(ok_));
  });
});

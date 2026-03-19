import { ok, strictEqual } from "node:assert";
import { describe, it } from "node:test";
import type {
  JsonRpcErrorResponse,
  JsonRpcNotification,
  JsonRpcRequest,
  JsonRpcResponse,
  McpContentItem,
  McpInitializeResult,
  McpToolAnnotations,
  McpToolResult,
  McpToolSchema,
  McpTransport,
} from "./types.ts";
import { CLIENT_INFO, PROTOCOL_VERSION } from "./types.ts";

describe("types", () => {
  it("exports protocol constants", () => {
    strictEqual(PROTOCOL_VERSION, "2025-03-26");
    strictEqual(CLIENT_INFO.name, "ghostpaw");
    strictEqual(CLIENT_INFO.version, "2.0.0");
  });

  it("type definitions are structurally sound", () => {
    const req: JsonRpcRequest = { jsonrpc: "2.0", id: 1, method: "test" };
    strictEqual(req.jsonrpc, "2.0");

    const notif: JsonRpcNotification = { jsonrpc: "2.0", method: "notify" };
    strictEqual(notif.method, "notify");

    const resp: JsonRpcResponse = { jsonrpc: "2.0", id: 1, result: {} };
    strictEqual(resp.id, 1);

    const err: JsonRpcErrorResponse = {
      jsonrpc: "2.0",
      id: 1,
      error: { code: -1, message: "fail" },
    };
    strictEqual(err.error.code, -1);

    const item: McpContentItem = { type: "text", text: "hello" };
    strictEqual(item.type, "text");

    const toolResult: McpToolResult = { content: [item] };
    strictEqual(toolResult.content.length, 1);

    const annotations: McpToolAnnotations = { readOnlyHint: true, destructiveHint: false };
    ok(annotations.readOnlyHint);

    const schema: McpToolSchema = {
      name: "test",
      inputSchema: { type: "object" },
      annotations,
    };
    strictEqual(schema.name, "test");
    ok(schema.annotations?.readOnlyHint);

    const initResult: McpInitializeResult = {
      protocolVersion: PROTOCOL_VERSION,
      capabilities: {},
      serverInfo: { name: "test", version: "1.0" },
    };
    strictEqual(initResult.protocolVersion, PROTOCOL_VERSION);

    const transport: McpTransport = {
      send: async () => null,
      close: async () => {},
      isConnected: () => true,
    };
    ok(transport.isConnected());
  });
});

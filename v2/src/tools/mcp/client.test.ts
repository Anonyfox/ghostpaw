import { ok, rejects, strictEqual } from "node:assert";
import { describe, it } from "node:test";
import { connectMcpServer } from "./client.ts";
import { resetIdCounter } from "./jsonrpc.ts";
import type {
  JsonRpcNotification,
  JsonRpcRequest,
  JsonRpcResponse,
  McpTransport,
} from "./types.ts";

function createMockTransport(
  responses: Record<string, (params?: Record<string, unknown>) => unknown>,
): McpTransport {
  let connected = true;
  return {
    async send(
      msg: JsonRpcRequest | JsonRpcNotification,
    ): Promise<JsonRpcResponse | null> {
      if (!("id" in msg) || msg.id === undefined) return null;
      const req = msg as JsonRpcRequest;
      const handler = responses[req.method];
      if (!handler) throw new Error(`Unexpected method: ${req.method}`);
      return { jsonrpc: "2.0", id: req.id, result: handler(req.params) };
    },
    async close() {
      connected = false;
    },
    isConnected: () => connected,
  };
}

const INIT_RESPONSE = () => ({
  protocolVersion: "2025-03-26",
  capabilities: { tools: {} },
  serverInfo: { name: "test-server", version: "1.0" },
});

const TOOLS_RESPONSE = () => ({
  tools: [
    {
      name: "echo",
      description: "Echoes input",
      inputSchema: {
        type: "object",
        properties: { msg: { type: "string" } },
      },
    },
    {
      name: "add",
      description: "Adds numbers",
      inputSchema: {
        type: "object",
        properties: { a: { type: "number" }, b: { type: "number" } },
      },
    },
  ],
});

describe("connectMcpServer", () => {
  it("completes handshake and discovers tools", async () => {
    resetIdCounter();
    const transport = createMockTransport({
      initialize: INIT_RESPONSE,
      "tools/list": TOOLS_RESPONSE,
    });

    const client = await connectMcpServer("test", transport);

    strictEqual(client.serverName, "test");
    strictEqual(client.protocolVersion, "2025-03-26");
    strictEqual(client.tools.length, 2);
    strictEqual(client.tools[0].name, "echo");
    strictEqual(client.tools[1].name, "add");

    await client.disconnect();
    ok(!transport.isConnected());
  });

  it("calls a tool successfully", async () => {
    resetIdCounter();
    const transport = createMockTransport({
      initialize: INIT_RESPONSE,
      "tools/list": TOOLS_RESPONSE,
      "tools/call": (params) => ({
        content: [
          {
            type: "text",
            text: `echoed: ${(params as Record<string, Record<string, string>>).arguments.msg}`,
          },
        ],
      }),
    });

    const client = await connectMcpServer("test", transport);
    const result = await client.callTool("echo", { msg: "hello" });

    strictEqual(result.content.length, 1);
    strictEqual(result.content[0].text, "echoed: hello");

    await client.disconnect();
  });

  it("rejects calling unknown tool", async () => {
    resetIdCounter();
    const transport = createMockTransport({
      initialize: INIT_RESPONSE,
      "tools/list": TOOLS_RESPONSE,
    });

    const client = await connectMcpServer("test", transport);

    await rejects(
      () => client.callTool("nonexistent", {}),
      /no tool named "nonexistent"/,
    );

    await client.disconnect();
  });

  it("wraps non-standard results as text", async () => {
    resetIdCounter();
    const transport = createMockTransport({
      initialize: INIT_RESPONSE,
      "tools/list": TOOLS_RESPONSE,
      "tools/call": () => ({ value: 42 }),
    });

    const client = await connectMcpServer("test", transport);
    const result = await client.callTool("echo", {});

    ok(result.content[0].text?.includes("42"));
    await client.disconnect();
  });

  it("throws on invalid initialize response", async () => {
    resetIdCounter();
    const transport = createMockTransport({
      initialize: () => ({ broken: true }),
    });

    await rejects(
      () => connectMcpServer("bad", transport),
      /invalid initialize result/,
    );
  });

  it("handles server with no tools", async () => {
    resetIdCounter();
    const transport = createMockTransport({
      initialize: INIT_RESPONSE,
      "tools/list": () => ({ tools: [] }),
    });

    const client = await connectMcpServer("empty", transport);
    strictEqual(client.tools.length, 0);
    await client.disconnect();
  });

  it("handles tools/list returning no tools array", async () => {
    resetIdCounter();
    const transport = createMockTransport({
      initialize: INIT_RESPONSE,
      "tools/list": () => ({}),
    });

    const client = await connectMcpServer("weird", transport);
    strictEqual(client.tools.length, 0);
    await client.disconnect();
  });

  it("times out on slow server", async () => {
    resetIdCounter();
    const transport: McpTransport = {
      async send() {
        await new Promise((r) => setTimeout(r, 5000));
        return null;
      },
      async close() {},
      isConnected: () => true,
    };

    await rejects(
      () => connectMcpServer("slow", transport, { timeoutMs: 200 }),
      /timed out/,
    );
  });

  it("rejects callTool on disconnected transport", async () => {
    resetIdCounter();
    const transport = createMockTransport({
      initialize: INIT_RESPONSE,
      "tools/list": TOOLS_RESPONSE,
    });

    const client = await connectMcpServer("test", transport);
    await client.disconnect();

    await rejects(
      () => client.callTool("echo", { msg: "test" }),
      /disconnected/,
    );
  });
});

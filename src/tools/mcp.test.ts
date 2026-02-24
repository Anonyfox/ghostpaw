import { ok, strictEqual } from "node:assert";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, it } from "node:test";
import { createMcpTool } from "./mcp.js";

const MCP_SERVER_CODE = `
const rl = require("readline").createInterface({ input: process.stdin });
rl.on("line", (line) => {
  try {
    const msg = JSON.parse(line);
    if (msg.id === undefined) return;
    let result;
    if (msg.method === "initialize") {
      result = {
        protocolVersion: "2024-11-05",
        capabilities: { tools: {} },
        serverInfo: { name: "mock-server", version: "1.0" },
      };
    } else if (msg.method === "tools/list") {
      result = {
        tools: [
          {
            name: "ping",
            description: "Returns pong",
            inputSchema: { type: "object", properties: { msg: { type: "string" } }, required: ["msg"] },
          },
          {
            name: "echo",
            description: "Echoes input",
            inputSchema: { type: "object", properties: { text: { type: "string" } } },
          },
        ],
      };
    } else if (msg.method === "tools/call") {
      const toolName = msg.params.name;
      const args = msg.params.arguments || {};
      if (toolName === "ping") {
        result = { content: [{ type: "text", text: "pong: " + (args.msg || "") }] };
      } else if (toolName === "echo") {
        result = { content: [{ type: "text", text: args.text || "" }] };
      } else {
        result = { content: [{ type: "text", text: "unknown tool" }] };
      }
    } else {
      result = {};
    }
    process.stdout.write(JSON.stringify({ jsonrpc: "2.0", id: msg.id, result }) + "\\n");
  } catch {}
});
`;

const ENV_SERVER_CODE = `
const rl = require("readline").createInterface({ input: process.stdin });
rl.on("line", (line) => {
  try {
    const msg = JSON.parse(line);
    if (msg.id === undefined) return;
    let result;
    if (msg.method === "initialize") {
      result = {
        protocolVersion: "2024-11-05",
        capabilities: {},
        serverInfo: { name: "env-server", version: "1.0" },
      };
    } else if (msg.method === "tools/list") {
      result = {
        tools: [{
          name: "check_env",
          description: "Returns env var",
          inputSchema: { type: "object", properties: {} },
        }],
      };
    } else if (msg.method === "tools/call") {
      result = { content: [{ type: "text", text: "secret=" + (process.env.MY_SECRET || "missing") }] };
    } else {
      result = {};
    }
    process.stdout.write(JSON.stringify({ jsonrpc: "2.0", id: msg.id, result }) + "\\n");
  } catch {}
});
`;

let workDir: string;
let shutdownFn: (() => Promise<void>) | null = null;
let serverPath: string;
let envServerPath: string;

beforeEach(() => {
  workDir = mkdtempSync(join(tmpdir(), "ghostpaw-mcp-tool-"));
  serverPath = join(workDir, "server.js");
  envServerPath = join(workDir, "env-server.js");
  writeFileSync(serverPath, MCP_SERVER_CODE);
  writeFileSync(envServerPath, ENV_SERVER_CODE);
});

afterEach(async () => {
  if (shutdownFn) {
    await shutdownFn();
    shutdownFn = null;
  }
  rmSync(workDir, { recursive: true, force: true });
});

describe("mcp tool", () => {
  it("discovers tools on a stdio server", async () => {
    const { tool, shutdown } = createMcpTool({ resolveSecret: () => null });
    shutdownFn = shutdown;

    const result = await tool.execute({
      args: { action: "discover", server: `node ${serverPath}` },
      ctx: { model: "test" },
    } as any);

    const parsed = result as Record<string, unknown>;
    ok(parsed.tools);
    const tools = parsed.tools as Array<Record<string, unknown>>;
    strictEqual(tools.length, 2);
    strictEqual(tools[0].name, "ping");
    strictEqual(tools[1].name, "echo");
  });

  it("calls a tool on a stdio server", async () => {
    const { tool, shutdown } = createMcpTool({ resolveSecret: () => null });
    shutdownFn = shutdown;

    const server = `node ${serverPath}`;

    await tool.execute({
      args: { action: "discover", server },
      ctx: { model: "test" },
    } as any);

    const result = await tool.execute({
      args: {
        action: "call",
        server,
        tool: "ping",
        input: '{"msg":"hello"}',
      },
      ctx: { model: "test" },
    } as any);

    strictEqual(result, "pong: hello");
  });

  it("reuses cached connection on subsequent calls", async () => {
    const { tool, shutdown } = createMcpTool({ resolveSecret: () => null });
    shutdownFn = shutdown;

    const server = `node ${serverPath}`;

    const r1 = await tool.execute({
      args: { action: "call", server, tool: "ping", input: '{"msg":"a"}' },
      ctx: { model: "test" },
    } as any);
    strictEqual(r1, "pong: a");

    const r2 = await tool.execute({
      args: { action: "call", server, tool: "echo", input: '{"text":"hello"}' },
      ctx: { model: "test" },
    } as any);
    strictEqual(r2, "hello");
  });

  it("returns error for missing server", async () => {
    const { tool, shutdown } = createMcpTool({ resolveSecret: () => null });
    shutdownFn = shutdown;

    const result = await tool.execute({
      args: { action: "discover", server: "" },
      ctx: { model: "test" },
    } as any);

    ok((result as Record<string, unknown>).error);
  });

  it("returns error for call without tool name", async () => {
    const { tool, shutdown } = createMcpTool({ resolveSecret: () => null });
    shutdownFn = shutdown;

    const result = await tool.execute({
      args: { action: "call", server: `node ${serverPath}` },
      ctx: { model: "test" },
    } as any);

    const err = result as Record<string, unknown>;
    ok(String(err.error).includes("tool is required"));
  });

  it("returns error for invalid JSON input", async () => {
    const { tool, shutdown } = createMcpTool({ resolveSecret: () => null });
    shutdownFn = shutdown;

    const result = await tool.execute({
      args: {
        action: "call",
        server: `node ${serverPath}`,
        tool: "ping",
        input: "not json",
      },
      ctx: { model: "test" },
    } as any);

    const err = result as Record<string, unknown>;
    ok(String(err.error).includes("Invalid JSON"));
  });

  it("handles connection failure gracefully", async () => {
    const crashScript = join(workDir, "crash.js");
    writeFileSync(crashScript, "process.exit(1);");

    const { tool, shutdown } = createMcpTool({ resolveSecret: () => null });
    shutdownFn = shutdown;

    const result = await tool.execute({
      args: { action: "discover", server: `node ${crashScript}` },
      ctx: { model: "test" },
    } as any);

    const err = result as Record<string, unknown>;
    ok(err.error);
    ok(String(err.error).includes("MCP error"));
  });

  it("resolves auth for stdio as env vars", async () => {
    const { tool, shutdown } = createMcpTool({
      resolveSecret: (name) => (name === "MY_SECRET" ? "s3cret" : null),
    });
    shutdownFn = shutdown;

    const result = await tool.execute({
      args: {
        action: "call",
        server: `node ${envServerPath}`,
        tool: "check_env",
        auth: "MY_SECRET",
      },
      ctx: { model: "test" },
    } as any);

    strictEqual(result, "secret=s3cret");
  });

  it("reconnects after shutdown", async () => {
    const { tool, shutdown } = createMcpTool({ resolveSecret: () => null });

    const server = `node ${serverPath}`;
    await tool.execute({
      args: { action: "discover", server },
      ctx: { model: "test" },
    } as any);

    await shutdown();

    const result = await tool.execute({
      args: { action: "call", server, tool: "ping", input: '{"msg":"after"}' },
      ctx: { model: "test" },
    } as any);
    strictEqual(result, "pong: after");

    shutdownFn = shutdown;
  });

  it("auto-detects HTTP transport for URLs", async () => {
    const { tool, shutdown } = createMcpTool({ resolveSecret: () => null });
    shutdownFn = shutdown;

    const result = await tool.execute({
      args: { action: "discover", server: "https://nonexistent.invalid/mcp" },
      ctx: { model: "test" },
    } as any);

    const err = result as Record<string, unknown>;
    ok(err.error);
    ok(String(err.error).includes("MCP error"));
  });
});

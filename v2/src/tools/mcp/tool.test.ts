import { ok, strictEqual } from "node:assert";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, it } from "node:test";
import { createMcpTool } from "./tool.ts";

type ToolExecArg = Parameters<ReturnType<typeof createMcpTool>["tool"]["execute"]>[0];

function execArgs(args: Record<string, unknown>): ToolExecArg {
  return { args, ctx: { model: "test" } } as ToolExecArg;
}

const MCP_SERVER_CODE = `
const rl = require("readline").createInterface({ input: process.stdin });
rl.on("line", (line) => {
  try {
    const msg = JSON.parse(line);
    if (msg.id === undefined) return;
    let result;
    if (msg.method === "initialize") {
      result = {
        protocolVersion: "2025-03-26",
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
        protocolVersion: "2025-03-26",
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

    const result = await tool.execute(
      execArgs({ action: "discover", server: `node ${serverPath}` }),
    );

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
    await tool.execute(execArgs({ action: "discover", server }));

    const result = await tool.execute(
      execArgs({ action: "call", server, tool: "ping", input: '{"msg":"hello"}' }),
    );

    strictEqual(result, "pong: hello");
  });

  it("reuses cached connection on subsequent calls", async () => {
    const { tool, shutdown } = createMcpTool({ resolveSecret: () => null });
    shutdownFn = shutdown;

    const server = `node ${serverPath}`;

    const r1 = await tool.execute(
      execArgs({ action: "call", server, tool: "ping", input: '{"msg":"a"}' }),
    );
    strictEqual(r1, "pong: a");

    const r2 = await tool.execute(
      execArgs({ action: "call", server, tool: "echo", input: '{"text":"hello"}' }),
    );
    strictEqual(r2, "hello");
  });

  it("returns error for missing server", async () => {
    const { tool, shutdown } = createMcpTool({ resolveSecret: () => null });
    shutdownFn = shutdown;

    const result = await tool.execute(execArgs({ action: "discover", server: "" }));
    ok((result as Record<string, unknown>).error);
  });

  it("returns error for call without tool name", async () => {
    const { tool, shutdown } = createMcpTool({ resolveSecret: () => null });
    shutdownFn = shutdown;

    const result = await tool.execute(execArgs({ action: "call", server: `node ${serverPath}` }));
    const err = result as Record<string, unknown>;
    ok(String(err.error).includes("tool is required"));
  });

  it("returns error for invalid JSON input", async () => {
    const { tool, shutdown } = createMcpTool({ resolveSecret: () => null });
    shutdownFn = shutdown;

    const result = await tool.execute(
      execArgs({
        action: "call",
        server: `node ${serverPath}`,
        tool: "ping",
        input: "not json",
      }),
    );
    const err = result as Record<string, unknown>;
    ok(String(err.error).includes("Invalid JSON"));
  });

  it("handles connection failure gracefully", async () => {
    const crashScript = join(workDir, "crash.js");
    writeFileSync(crashScript, "process.exit(1);");

    const { tool, shutdown } = createMcpTool({ resolveSecret: () => null });
    shutdownFn = shutdown;

    const result = await tool.execute(
      execArgs({ action: "discover", server: `node ${crashScript}` }),
    );
    const err = result as Record<string, unknown>;
    ok(err.error);
    ok(String(err.error).includes("MCP error"));
  });

  it("resolves auth for stdio as env vars", async () => {
    const { tool, shutdown } = createMcpTool({
      resolveSecret: (name) => (name === "MY_SECRET" ? "s3cret" : null),
    });
    shutdownFn = shutdown;

    const result = await tool.execute(
      execArgs({
        action: "call",
        server: `node ${envServerPath}`,
        tool: "check_env",
        auth: "MY_SECRET",
      }),
    );
    strictEqual(result, "secret=s3cret");
  });

  it("reconnects after shutdown", async () => {
    const { tool, shutdown } = createMcpTool({ resolveSecret: () => null });

    const server = `node ${serverPath}`;
    await tool.execute(execArgs({ action: "discover", server }));

    await shutdown();

    const result = await tool.execute(
      execArgs({ action: "call", server, tool: "ping", input: '{"msg":"after"}' }),
    );
    strictEqual(result, "pong: after");

    shutdownFn = shutdown;
  });

  it("auto-detects HTTP transport for URLs", async () => {
    const { tool, shutdown } = createMcpTool({ resolveSecret: () => null });
    shutdownFn = shutdown;

    const result = await tool.execute(
      execArgs({ action: "discover", server: "https://nonexistent.invalid/mcp" }),
    );
    const err = result as Record<string, unknown>;
    ok(err.error);
    ok(String(err.error).includes("MCP error"));
  });

  it("defaults to empty input when not provided", async () => {
    const { tool, shutdown } = createMcpTool({ resolveSecret: () => null });
    shutdownFn = shutdown;

    const server = `node ${serverPath}`;
    const result = await tool.execute(execArgs({ action: "call", server, tool: "ping" }));
    strictEqual(result, "pong: ");
  });

  it("returns error for unknown action", async () => {
    const { tool, shutdown } = createMcpTool({ resolveSecret: () => null });
    shutdownFn = shutdown;

    const result = await tool.execute(
      execArgs({ action: "list" as "discover", server: `node ${serverPath}` }),
    );
    const err = result as Record<string, unknown>;
    ok(String(err.error).includes("Unknown action"));
  });

  it("strips surrounding double quotes from tool name", async () => {
    const { tool, shutdown } = createMcpTool({ resolveSecret: () => null });
    shutdownFn = shutdown;

    const server = `node ${serverPath}`;
    const result = await tool.execute(
      execArgs({ action: "call", server, tool: '"ping"', input: '{"msg":"quoted"}' }),
    );
    strictEqual(result, "pong: quoted");
  });

  it("strips surrounding single quotes from tool name", async () => {
    const { tool, shutdown } = createMcpTool({ resolveSecret: () => null });
    shutdownFn = shutdown;

    const server = `node ${serverPath}`;
    const result = await tool.execute(
      execArgs({ action: "call", server, tool: "'echo'", input: '{"text":"hi"}' }),
    );
    strictEqual(result, "hi");
  });

  it("strips surrounding backticks from tool name", async () => {
    const { tool, shutdown } = createMcpTool({ resolveSecret: () => null });
    shutdownFn = shutdown;

    const server = `node ${serverPath}`;
    const result = await tool.execute(
      execArgs({ action: "call", server, tool: "`ping`", input: '{"msg":"bt"}' }),
    );
    strictEqual(result, "pong: bt");
  });

  it("handles double-encoded JSON input", async () => {
    const { tool, shutdown } = createMcpTool({ resolveSecret: () => null });
    shutdownFn = shutdown;

    const server = `node ${serverPath}`;
    const doubleEncoded = JSON.stringify(JSON.stringify({ msg: "double" }));
    const result = await tool.execute(
      execArgs({ action: "call", server, tool: "ping", input: doubleEncoded }),
    );
    strictEqual(result, "pong: double");
  });

  it("handles input passed as object instead of string", async () => {
    const { tool, shutdown } = createMcpTool({ resolveSecret: () => null });
    shutdownFn = shutdown;

    const server = `node ${serverPath}`;
    const result = await tool.execute(
      execArgs({
        action: "call",
        server,
        tool: "ping",
        input: { msg: "obj" } as unknown as string,
      }),
    );
    strictEqual(result, "pong: obj");
  });

  it("rejects non-object JSON input (array)", async () => {
    const { tool, shutdown } = createMcpTool({ resolveSecret: () => null });
    shutdownFn = shutdown;

    const result = await tool.execute(
      execArgs({ action: "call", server: `node ${serverPath}`, tool: "ping", input: "[1,2,3]" }),
    );
    const err = result as Record<string, unknown>;
    ok(String(err.error).includes("input must be a JSON object"));
  });
});

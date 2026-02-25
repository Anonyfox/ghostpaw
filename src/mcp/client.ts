import { createNotification, createRequest, isErrorResponse } from "./jsonrpc.js";
import type {
  JsonRpcErrorResponse,
  McpInitializeResult,
  McpToolResult,
  McpToolSchema,
  McpTransport,
} from "./types.js";

const CLIENT_INFO = { name: "ghostpaw", version: "1.0.0" };
const PROTOCOL_VERSION = "2024-11-05";

export interface McpClient {
  readonly serverName: string;
  readonly tools: McpToolSchema[];
  callTool(name: string, args: Record<string, unknown>): Promise<McpToolResult>;
  disconnect(): Promise<void>;
}

export async function connectMcpServer(
  serverName: string,
  transport: McpTransport,
  options?: { timeoutMs?: number },
): Promise<McpClient> {
  const timeout = options?.timeoutMs ?? 30_000;

  const result = await withTimeout(
    (async () => {
      const initReq = createRequest("initialize", {
        protocolVersion: PROTOCOL_VERSION,
        capabilities: {},
        clientInfo: CLIENT_INFO,
      });

      const initResp = await transport.send(initReq.msg);
      if (!initResp) throw new Error(`MCP server "${serverName}" returned no initialize response`);

      const initResult = initResp.result as McpInitializeResult;
      if (!initResult?.protocolVersion || !initResult?.serverInfo) {
        throw new Error(`MCP server "${serverName}" returned invalid initialize result`);
      }

      await transport.send(createNotification("notifications/initialized"));

      const listReq = createRequest("tools/list");
      const listResp = await transport.send(listReq.msg);
      if (!listResp) throw new Error(`MCP server "${serverName}" returned no tools/list response`);

      const listResult = listResp.result as { tools?: McpToolSchema[] };
      const tools: McpToolSchema[] = Array.isArray(listResult?.tools) ? listResult.tools : [];

      return { initResult, tools };
    })(),
    timeout,
    `MCP connection to "${serverName}" timed out after ${timeout}ms`,
  );

  const { tools } = result;
  const toolNames = new Set(tools.map((t) => t.name));

  async function callTool(name: string, args: Record<string, unknown>): Promise<McpToolResult> {
    if (!transport.isConnected()) {
      throw new Error(`MCP server "${serverName}" is disconnected`);
    }
    if (!toolNames.has(name)) {
      throw new Error(`MCP server "${serverName}" has no tool named "${name}"`);
    }

    const req = createRequest("tools/call", { name, arguments: args });
    const resp = await transport.send(req.msg);
    if (!resp) throw new Error(`MCP server "${serverName}" returned no response for tools/call`);

    const checked = resp as typeof resp | JsonRpcErrorResponse;
    if (isErrorResponse(checked)) {
      throw new Error(
        `MCP tool "${name}" error: ${checked.error.message} (code ${checked.error.code})`,
      );
    }

    const callResult = resp.result as McpToolResult;
    if (!callResult || !Array.isArray(callResult.content)) {
      return { content: [{ type: "text", text: JSON.stringify(resp.result) }] };
    }
    return callResult;
  }

  async function disconnect(): Promise<void> {
    await transport.close();
  }

  return { serverName, tools, callTool, disconnect };
}

function withTimeout<T>(promise: Promise<T>, ms: number, message: string): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(message)), ms);
    promise
      .then((v) => {
        clearTimeout(timer);
        resolve(v);
      })
      .catch((e) => {
        clearTimeout(timer);
        reject(e);
      });
  });
}

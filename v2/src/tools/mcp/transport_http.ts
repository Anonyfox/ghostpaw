import { isErrorResponse, parseResponse, parseSSEData } from "./jsonrpc.ts";
import type {
  JsonRpcNotification,
  JsonRpcRequest,
  JsonRpcResponse,
  McpTransport,
} from "./types.ts";
import { PROTOCOL_VERSION } from "./types.ts";

const DEFAULT_TIMEOUT_MS = 30_000;

export function validateHttpUrl(url: string): void {
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    throw new Error(`Invalid MCP HTTP URL: ${url}`);
  }
  const isLocalhost = parsed.hostname === "localhost" || parsed.hostname === "127.0.0.1";
  if (parsed.protocol !== "https:" && !isLocalhost) {
    throw new Error(
      `MCP HTTP transport requires HTTPS for remote hosts (got ${url}). ` +
        "Use http:// only for localhost.",
    );
  }
}

export function createHttpTransport(config: {
  url: string;
  headers?: Record<string, string>;
  timeoutMs?: number;
  protocolVersion?: string;
}): McpTransport {
  validateHttpUrl(config.url);

  const timeoutMs = config.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  const version = config.protocolVersion ?? PROTOCOL_VERSION;
  const baseHeaders: Record<string, string> = {
    "Content-Type": "application/json",
    Accept: "application/json, text/event-stream",
    "MCP-Protocol-Version": version,
    ...(config.headers ?? {}),
  };

  let sessionId: string | null = null;
  let connected = true;

  async function send(
    msg: JsonRpcRequest | JsonRpcNotification,
  ): Promise<JsonRpcResponse | null> {
    if (!connected) {
      throw new Error("MCP HTTP transport is disconnected");
    }

    const headers: Record<string, string> = { ...baseHeaders };
    if (sessionId) headers["Mcp-Session-Id"] = sessionId;

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);

    let res: Response;
    try {
      res = await fetch(config.url, {
        method: "POST",
        headers,
        body: JSON.stringify(msg),
        signal: controller.signal,
      });
    } catch (err) {
      clearTimeout(timer);
      if ((err as Error).name === "AbortError") {
        throw new Error(`MCP HTTP request timed out after ${timeoutMs}ms`);
      }
      throw new Error(`MCP HTTP request failed: ${(err as Error).message}`);
    } finally {
      clearTimeout(timer);
    }

    const newSessionId = res.headers.get("mcp-session-id");
    if (newSessionId) sessionId = newSessionId;

    if (!res.ok) {
      const body = await res.text().catch(() => "");
      throw new Error(`MCP HTTP error ${res.status}: ${body.slice(0, 500)}`);
    }

    const isNotification = !("id" in msg) || msg.id === undefined;
    if (isNotification) {
      await res.text().catch(() => {});
      return null;
    }

    const contentType = res.headers.get("content-type") ?? "";

    if (contentType.includes("text/event-stream")) {
      const text = await res.text();
      const payloads = parseSSEData(text);
      for (const payload of payloads) {
        try {
          const parsed = parseResponse(payload);
          if (!isErrorResponse(parsed) && parsed.id === (msg as JsonRpcRequest).id) {
            return parsed;
          }
          if (isErrorResponse(parsed)) {
            throw new Error(
              `MCP server error: ${parsed.error.message} (code ${parsed.error.code})`,
            );
          }
        } catch (e) {
          if ((e as Error).message.startsWith("MCP server error")) throw e;
        }
      }
      throw new Error("No matching JSON-RPC response found in SSE stream");
    }

    const text = await res.text();
    const parsed = parseResponse(text);
    if (isErrorResponse(parsed)) {
      throw new Error(`MCP server error: ${parsed.error.message} (code ${parsed.error.code})`);
    }
    return parsed as JsonRpcResponse;
  }

  async function close(): Promise<void> {
    if (!connected) return;
    connected = false;

    if (sessionId) {
      const headers: Record<string, string> = { ...baseHeaders };
      headers["Mcp-Session-Id"] = sessionId;
      try {
        await fetch(config.url, {
          method: "DELETE",
          headers,
          signal: AbortSignal.timeout(5_000),
        });
      } catch {
        // best-effort session termination
      }
      sessionId = null;
    }
  }

  return {
    send,
    close,
    isConnected: () => connected,
  };
}

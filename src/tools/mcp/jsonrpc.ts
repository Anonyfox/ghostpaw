import type {
  JsonRpcErrorResponse,
  JsonRpcNotification,
  JsonRpcRequest,
  JsonRpcResponse,
} from "./types.ts";

let nextId = 1;

export function resetIdCounter(): void {
  nextId = 1;
}

export function createRequest(
  method: string,
  params?: Record<string, unknown>,
): { msg: JsonRpcRequest; id: number } {
  const id = nextId++;
  const msg: JsonRpcRequest = { jsonrpc: "2.0", id, method };
  if (params !== undefined) msg.params = params;
  return { msg, id };
}

export function createNotification(
  method: string,
  params?: Record<string, unknown>,
): JsonRpcNotification {
  const msg: JsonRpcNotification = { jsonrpc: "2.0", method };
  if (params !== undefined) msg.params = params;
  return msg;
}

export function isJsonRpcMessage(line: string): boolean {
  const trimmed = line.trim();
  if (!trimmed.startsWith("{")) return false;
  try {
    const obj = JSON.parse(trimmed);
    return obj?.jsonrpc === "2.0";
  } catch {
    return false;
  }
}

export function parseResponse(raw: string): JsonRpcResponse | JsonRpcErrorResponse {
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new Error(`Invalid JSON in response: ${raw.slice(0, 200)}`);
  }

  if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) {
    throw new Error("JSON-RPC response must be an object");
  }

  const obj = parsed as Record<string, unknown>;
  if (obj.jsonrpc !== "2.0") {
    throw new Error(`Invalid jsonrpc version: ${String(obj.jsonrpc)}`);
  }

  if ("error" in obj && obj.error) {
    const err = obj.error as Record<string, unknown>;
    if (typeof err.code !== "number" || typeof err.message !== "string") {
      throw new Error("Malformed JSON-RPC error object");
    }
    return obj as unknown as JsonRpcErrorResponse;
  }

  if (!("result" in obj)) {
    throw new Error("JSON-RPC response missing both result and error");
  }

  if (typeof obj.id !== "number") {
    throw new Error(`Invalid response id: ${String(obj.id)}`);
  }

  return obj as unknown as JsonRpcResponse;
}

export function parseSSEData(chunk: string): string[] {
  const results: string[] = [];
  for (const line of chunk.split("\n")) {
    const trimmed = line.trim();
    if (trimmed.startsWith("data:")) {
      const payload = trimmed.slice(5).trim();
      if (payload) results.push(payload);
    }
  }
  return results;
}

export function isErrorResponse(
  r: JsonRpcResponse | JsonRpcErrorResponse,
): r is JsonRpcErrorResponse {
  return "error" in r;
}

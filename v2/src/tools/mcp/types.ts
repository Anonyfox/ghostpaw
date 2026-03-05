// ── JSON-RPC 2.0 ────────────────────────────────────────────────────────────

export interface JsonRpcRequest {
  jsonrpc: "2.0";
  id: number;
  method: string;
  params?: Record<string, unknown>;
}

export interface JsonRpcNotification {
  jsonrpc: "2.0";
  method: string;
  params?: Record<string, unknown>;
}

export interface JsonRpcResponse {
  jsonrpc: "2.0";
  id: number;
  result: unknown;
}

export interface JsonRpcErrorDetail {
  code: number;
  message: string;
  data?: unknown;
}

export interface JsonRpcErrorResponse {
  jsonrpc: "2.0";
  id: number | null;
  error: JsonRpcErrorDetail;
}

// ── MCP Protocol ────────────────────────────────────────────────────────────

export interface McpCapabilities {
  tools?: Record<string, unknown>;
  resources?: Record<string, unknown>;
  prompts?: Record<string, unknown>;
  [key: string]: unknown;
}

export interface McpServerInfo {
  name: string;
  version: string;
}

export interface McpInitializeResult {
  protocolVersion: string;
  capabilities: McpCapabilities;
  serverInfo: McpServerInfo;
}

export interface McpToolAnnotations {
  title?: string;
  readOnlyHint?: boolean;
  destructiveHint?: boolean;
  idempotentHint?: boolean;
  openWorldHint?: boolean;
}

export interface McpToolSchema {
  name: string;
  description?: string;
  inputSchema: JsonSchemaObject;
  annotations?: McpToolAnnotations;
}

export interface JsonSchemaObject {
  type: "object";
  properties?: Record<string, JsonSchemaProperty>;
  required?: string[];
  [key: string]: unknown;
}

export interface JsonSchemaProperty {
  type?: string;
  description?: string;
  enum?: unknown[];
  items?: JsonSchemaProperty;
  properties?: Record<string, JsonSchemaProperty>;
  required?: string[];
  default?: unknown;
  [key: string]: unknown;
}

export interface McpContentItem {
  type: string;
  text?: string;
  data?: string;
  mimeType?: string;
}

export interface McpToolResult {
  content: McpContentItem[];
  isError?: boolean;
}

// ── Transport ───────────────────────────────────────────────────────────────

export interface McpTransport {
  send(msg: JsonRpcRequest | JsonRpcNotification): Promise<JsonRpcResponse | null>;
  close(): Promise<void>;
  isConnected(): boolean;
}

// ── Constants ───────────────────────────────────────────────────────────────

export const PROTOCOL_VERSION = "2025-03-26";
export const CLIENT_INFO = { name: "ghostpaw", version: "2.0.0" } as const;

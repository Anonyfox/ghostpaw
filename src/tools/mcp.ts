import { createTool, Schema, type Tool } from "chatoyant";
import { connectMcpServer, type McpClient } from "../mcp/client.js";
import { createHttpTransport } from "../mcp/transport-http.js";
import { createStdioTransport } from "../mcp/transport-stdio.js";
import type { McpToolSchema } from "../mcp/types.js";

class McpParams extends Schema {
  action = Schema.Enum(["discover", "call"] as const, {
    description: "discover: list tools on an MCP server. call: invoke a specific tool.",
  });
  server = Schema.String({
    description:
      "MCP server endpoint. URL (https://...) for HTTP, or command string (e.g. 'npx -y @mcp/server') for stdio.",
  });
  tool = Schema.String({
    description: "Tool name to invoke (required for action: call).",
    optional: true,
  });
  input = Schema.String({
    description: "Tool arguments as a JSON object string (required for action: call).",
    optional: true,
  });
  auth = Schema.String({
    description:
      "Secret name(s) for auth. HTTP: Bearer token secret. Stdio: env var secret(s), comma-separated.",
    optional: true,
  });
}

interface McpToolConfig {
  resolveSecret: (name: string) => string | null;
}

function cleanServerString(raw: string): string {
  return raw.replace(/^[\s\u200B\uFEFF"'`<]+/, "").replace(/[\s\u200B\uFEFF"'`>]+$/, "");
}

function isUrl(server: string): boolean {
  try {
    const u = new URL(server);
    return u.protocol === "http:" || u.protocol === "https:";
  } catch {
    return false;
  }
}

function parseCommand(server: string): { command: string; args: string[] } {
  const parts = server.trim().split(/\s+/);
  return { command: parts[0], args: parts.slice(1) };
}

function resolveHttpAuth(
  authName: string | undefined,
  resolveSecret: (name: string) => string | null,
): Record<string, string> | undefined {
  if (!authName) return undefined;
  const value = resolveSecret(authName.trim());
  if (!value) return undefined;
  return { Authorization: `Bearer ${value}` };
}

function resolveStdioEnv(
  authNames: string | undefined,
  resolveSecret: (name: string) => string | null,
): Record<string, string> | undefined {
  if (!authNames) return undefined;
  const env: Record<string, string> = {};
  let hasAny = false;
  for (const name of authNames.split(",")) {
    const trimmed = name.trim();
    if (!trimmed) continue;
    const value = resolveSecret(trimmed);
    if (value) {
      env[trimmed] = value;
      hasAny = true;
    }
  }
  return hasAny ? env : undefined;
}

function serverLabel(server: string): string {
  if (isUrl(server)) {
    try {
      const u = new URL(server);
      return u.hostname;
    } catch {
      return server.slice(0, 40);
    }
  }
  return parseCommand(server).command;
}

function formatToolSchema(t: McpToolSchema): Record<string, unknown> {
  const params: Record<string, string> = {};
  const props = t.inputSchema?.properties ?? {};
  const required = new Set(t.inputSchema?.required ?? []);
  for (const [k, v] of Object.entries(props)) {
    params[k] = `${v.type ?? "string"}${required.has(k) ? " (required)" : " (optional)"}`;
  }
  return {
    name: t.name,
    description: t.description ?? "",
    parameters: params,
  };
}

export function createMcpTool(config: McpToolConfig): {
  tool: Tool;
  shutdown: () => Promise<void>;
} {
  const connections = new Map<string, McpClient>();

  async function getOrConnect(server: string, auth: string | undefined): Promise<McpClient> {
    const existing = connections.get(server);
    if (existing) return existing;

    const label = serverLabel(server);
    let transport: ReturnType<typeof createHttpTransport>;

    if (isUrl(server)) {
      transport = createHttpTransport({
        url: server,
        headers: resolveHttpAuth(auth, config.resolveSecret),
      });
    } else {
      const { command, args } = parseCommand(server);
      transport = createStdioTransport({
        command,
        args,
        env: resolveStdioEnv(auth, config.resolveSecret),
      });
    }

    const client = await connectMcpServer(label, transport);
    connections.set(server, client);
    return client;
  }

  async function shutdown(): Promise<void> {
    const clients = [...connections.values()];
    connections.clear();
    await Promise.allSettled(clients.map((c) => c.disconnect()));
  }

  const tool = createTool({
    name: "mcp",
    description:
      "Connect to external MCP servers to discover and invoke their tools. Read relevant skills for server details before calling.",
    // biome-ignore lint/suspicious/noExplicitAny: chatoyant Schema cast
    parameters: new McpParams() as any,
    execute: async ({ args }) => {
      const raw = args as unknown as {
        action: "discover" | "call";
        server: string;
        tool?: string;
        input?: string;
        auth?: string;
      };

      const action = raw.action;
      const server = raw.server ? cleanServerString(raw.server) : "";
      const toolName = raw.tool?.trim();
      const input = raw.input;
      const auth = raw.auth?.trim();

      if (!server) return { error: "server is required" };

      try {
        if (action === "discover") {
          const client = await getOrConnect(server, auth);
          return {
            server,
            serverInfo: { name: client.serverName },
            tools: client.tools.map(formatToolSchema),
          };
        }

        if (action === "call") {
          if (!toolName) return { error: "tool is required for action: call" };

          let parsedInput: Record<string, unknown> = {};
          if (input) {
            try {
              parsedInput = JSON.parse(input);
            } catch {
              return { error: `Invalid JSON in input: ${input.slice(0, 200)}` };
            }
          }

          const client = await getOrConnect(server, auth);
          const result = await client.callTool(toolName, parsedInput);

          const texts = result.content
            .filter((c) => c.type === "text" && c.text)
            .map((c) => c.text!);

          if (result.isError) {
            return { error: texts.join("\n") || "MCP tool returned an error" };
          }

          return texts.length === 1 ? texts[0] : texts.join("\n\n");
        }

        return { error: `Unknown action: ${action}` };
      } catch (err) {
        connections.delete(server);
        return { error: `MCP error: ${(err as Error).message}` };
      }
    },
  });

  return { tool, shutdown };
}

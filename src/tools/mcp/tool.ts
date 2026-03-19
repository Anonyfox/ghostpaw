import { createTool, Schema } from "chatoyant";
import { cleanServerString, createConnectionPool } from "./connections.ts";
import { formatToolSchema } from "./format_schema.ts";

class McpParams extends Schema {
  action = Schema.Enum(["discover", "call"] as const, {
    description: "discover: list tools on an MCP server. call: invoke a specific tool.",
  });
  server = Schema.String({
    description:
      "MCP server endpoint. URL (https://...) for HTTP, or command string " +
      "(e.g. 'npx -y @mcp/server') for stdio.",
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
      "Secret name(s) for auth. HTTP: Bearer token secret. " +
      "Stdio: env var secret(s), comma-separated.",
    optional: true,
  });
}

interface McpToolConfig {
  resolveSecret: (name: string) => string | null;
}

export function createMcpTool(config: McpToolConfig) {
  const pool = createConnectionPool();

  const tool = createTool({
    name: "mcp",
    description:
      "Connect to external MCP servers to discover and invoke their tools. " +
      "Read relevant skills for server details before calling.",
    // biome-ignore lint/suspicious/noExplicitAny: chatoyant SchemaInstance index-signature limitation
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
      const toolName = raw.tool ? cleanServerString(raw.tool) : undefined;
      const inputRaw: unknown = raw.input;
      const auth = raw.auth?.trim();

      if (!server) return { error: "server is required" };

      try {
        if (action === "discover") {
          const client = await pool.getOrConnect(server, auth, config.resolveSecret);
          return {
            server,
            serverInfo: { name: client.serverName },
            tools: client.tools.map(formatToolSchema),
          };
        }

        if (action === "call") {
          if (!toolName) return { error: "tool is required for action: call" };

          const inputResult = parseToolInput(inputRaw);
          if (!inputResult.ok) return { error: inputResult.error };
          const parsedInput = inputResult.value;

          const client = await pool.getOrConnect(server, auth, config.resolveSecret);
          const result = await client.callTool(toolName, parsedInput);

          const texts = result.content
            .filter((c) => c.type === "text" && c.text)
            .map((c) => c.text!);

          const images = result.content
            .filter((c) => c.type === "image" && c.data)
            .map((c) => `[image: ${c.mimeType ?? "unknown"}, ${c.data!.length} bytes base64]`);

          const all = [...texts, ...images];

          if (result.isError) {
            return { error: all.join("\n") || "MCP tool returned an error" };
          }

          return all.length === 1 ? all[0] : all.join("\n\n");
        }

        return { error: `Unknown action: ${action}` };
      } catch (err) {
        await pool.evict(server, auth);
        return { error: `MCP error: ${(err as Error).message}` };
      }
    },
  });

  return { tool, shutdown: () => pool.shutdown() };
}

type InputResult = { ok: true; value: Record<string, unknown> } | { ok: false; error: string };

/**
 * Normalize LLM-provided input into a plain object.
 * Handles: missing/empty → {}, already an object, JSON string,
 * double-encoded JSON string (model wrapped object in extra quotes).
 */
function parseToolInput(raw: unknown): InputResult {
  if (raw == null || raw === "") return { ok: true, value: {} };

  if (typeof raw === "object" && !Array.isArray(raw)) {
    return { ok: true, value: raw as Record<string, unknown> };
  }

  try {
    let parsed: unknown = JSON.parse(String(raw));
    if (typeof parsed === "string") {
      try {
        parsed = JSON.parse(parsed);
      } catch {
        // inner string isn't JSON — fall through to the type check
      }
    }
    if (typeof parsed === "object" && parsed !== null && !Array.isArray(parsed)) {
      return { ok: true, value: parsed as Record<string, unknown> };
    }
    return { ok: false, error: `input must be a JSON object, got: ${String(raw).slice(0, 200)}` };
  } catch {
    return { ok: false, error: `Invalid JSON in input: ${String(raw).slice(0, 200)}` };
  }
}

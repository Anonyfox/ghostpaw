import type { McpClient } from "./client.ts";
import { connectMcpServer } from "./client.ts";
import { parseCommand } from "./parse_command.ts";
import { resolveHttpAuth, resolveStdioEnv } from "./resolve_auth.ts";
import { createHttpTransport } from "./transport_http.ts";
import { createStdioTransport } from "./transport_stdio.ts";

const CLEAN_RE = /^[\s\u200B\uFEFF"'`<]+|[\s\u200B\uFEFF"'`>]+$/g;

export function cleanServerString(raw: string): string {
  return raw.replace(CLEAN_RE, "");
}

export function isUrl(server: string): boolean {
  try {
    const u = new URL(server);
    return u.protocol === "http:" || u.protocol === "https:";
  } catch {
    return false;
  }
}

function cacheKey(server: string, auth: string | undefined): string {
  return `${server}\0${auth ?? ""}`;
}

function serverLabel(server: string): string {
  if (isUrl(server)) {
    try {
      return new URL(server).hostname;
    } catch {
      return server.slice(0, 40);
    }
  }
  return parseCommand(server).command;
}

export interface ConnectionPool {
  getOrConnect(
    server: string,
    auth: string | undefined,
    resolveSecret: (name: string) => string | null,
  ): Promise<McpClient>;
  evict(server: string, auth: string | undefined): Promise<void>;
  shutdown(): Promise<void>;
}

export function createConnectionPool(): ConnectionPool {
  const connections = new Map<string, McpClient>();

  async function getOrConnect(
    server: string,
    auth: string | undefined,
    resolveSecret: (name: string) => string | null,
  ): Promise<McpClient> {
    const key = cacheKey(server, auth);
    const existing = connections.get(key);
    if (existing) return existing;

    const label = serverLabel(server);

    const transport = isUrl(server)
      ? createHttpTransport({
          url: server,
          headers: resolveHttpAuth(auth, resolveSecret),
        })
      : (() => {
          const { command, args } = parseCommand(server);
          return createStdioTransport({
            command,
            args,
            env: resolveStdioEnv(auth, resolveSecret),
          });
        })();

    const client = await connectMcpServer(label, transport);
    connections.set(key, client);
    return client;
  }

  async function evict(server: string, auth: string | undefined): Promise<void> {
    const key = cacheKey(server, auth);
    const client = connections.get(key);
    if (client) {
      connections.delete(key);
      try {
        await client.disconnect();
      } catch {
        // best-effort cleanup
      }
    }
  }

  async function shutdown(): Promise<void> {
    const clients = [...connections.values()];
    connections.clear();
    await Promise.allSettled(clients.map((c) => c.disconnect()));
  }

  return { getOrConnect, evict, shutdown };
}

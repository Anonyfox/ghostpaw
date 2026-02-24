import { spawn, type ChildProcess } from "node:child_process";
import { createInterface } from "node:readline";
import type {
  JsonRpcNotification,
  JsonRpcRequest,
  JsonRpcResponse,
  McpTransport,
} from "./types.js";
import { isJsonRpcMessage, parseResponse } from "./jsonrpc.js";

const DEFAULT_TIMEOUT_MS = 30_000;
const KILL_GRACE_MS = 2_000;
const SAFE_ENV_KEYS = ["PATH", "HOME", "NODE_PATH", "TERM", "LANG"];

interface PendingRequest {
  resolve: (r: JsonRpcResponse) => void;
  reject: (e: Error) => void;
  timer: ReturnType<typeof setTimeout>;
}

export function createStdioTransport(config: {
  command: string;
  args?: string[];
  env?: Record<string, string>;
  cwd?: string;
  timeoutMs?: number;
}): McpTransport {
  const timeoutMs = config.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  const pending = new Map<number, PendingRequest>();
  let connected = false;
  let proc: ChildProcess | null = null;

  const safeEnv: Record<string, string> = {};
  for (const k of SAFE_ENV_KEYS) {
    if (process.env[k]) safeEnv[k] = process.env[k]!;
  }
  if (config.env) Object.assign(safeEnv, config.env);

  proc = spawn(config.command, config.args ?? [], {
    cwd: config.cwd,
    env: safeEnv,
    stdio: ["pipe", "pipe", "pipe"],
  });

  connected = true;

  const rl = createInterface({ input: proc.stdout!, crlfDelay: Number.POSITIVE_INFINITY });
  rl.on("line", (line) => {
    if (!isJsonRpcMessage(line)) return;
    try {
      const parsed = parseResponse(line);
      const id = parsed.id;
      if (id == null) return;
      const entry = pending.get(id);
      if (!entry) return;
      pending.delete(id);
      clearTimeout(entry.timer);
      entry.resolve(parsed as JsonRpcResponse);
    } catch {
      // malformed response — ignore
    }
  });

  function rejectAll(reason: string): void {
    connected = false;
    for (const [id, entry] of pending) {
      clearTimeout(entry.timer);
      entry.reject(new Error(reason));
      pending.delete(id);
    }
  }

  proc.on("error", (err) => rejectAll(`MCP stdio process error: ${err.message}`));
  proc.on("exit", (code) => rejectAll(`MCP stdio process exited (code ${code ?? "unknown"})`));

  function send(
    msg: JsonRpcRequest | JsonRpcNotification,
  ): Promise<JsonRpcResponse | null> {
    if (!connected || !proc?.stdin?.writable) {
      return Promise.reject(new Error("MCP stdio transport is disconnected"));
    }

    const line = `${JSON.stringify(msg)}\n`;
    proc.stdin.write(line);

    if (!("id" in msg) || msg.id === undefined) {
      return Promise.resolve(null);
    }

    const id = (msg as JsonRpcRequest).id;
    return new Promise<JsonRpcResponse>((resolve, reject) => {
      const timer = setTimeout(() => {
        pending.delete(id);
        reject(new Error(`MCP stdio request timed out after ${timeoutMs}ms (id=${id})`));
      }, timeoutMs);

      pending.set(id, { resolve, reject, timer });
    });
  }

  async function close(): Promise<void> {
    if (!proc || !connected) return;
    connected = false;
    rejectAll("Transport closing");

    rl.close();

    const p = proc;
    proc = null;

    await new Promise<void>((resolve) => {
      const killTimer = setTimeout(() => {
        try {
          p.kill("SIGKILL");
        } catch {
          // already dead
        }
        resolve();
      }, KILL_GRACE_MS);

      p.once("exit", () => {
        clearTimeout(killTimer);
        resolve();
      });

      try {
        p.kill("SIGTERM");
      } catch {
        clearTimeout(killTimer);
        resolve();
      }
    });
  }

  return {
    send,
    close,
    isConnected: () => connected,
  };
}

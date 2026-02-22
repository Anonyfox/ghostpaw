import { spawnSync } from "node:child_process";
import { realpathSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { parseArgs } from "node:util";

// ── Version ──────────────────────────────────────────────────────────────────

declare const __VERSION__: string;
const VERSION = __VERSION__;

// ── CLI detection ────────────────────────────────────────────────────────────
// Compares resolved real paths to handle npm bin symlinks correctly.

function isCLI(): boolean {
  try {
    const self = realpathSync(fileURLToPath(import.meta.url));
    const invoked = realpathSync(process.argv[1]);
    return self === invoked;
  } catch {
    return false;
  }
}

// ── SQLite bootstrap ─────────────────────────────────────────────────────────
// node:sqlite is experimental in Node 22.x and requires --experimental-sqlite.
// When invoked as CLI we transparently re-exec with the flag so the user never
// has to remember it. Library consumers must set the flag themselves (or via
// NODE_OPTIONS) — we give them a clear error at database init time instead of
// silently re-spawning their process.

function ensureSqliteFlag(): void {
  if (process.execArgv.includes("--experimental-sqlite")) return;

  const result = spawnSync(
    process.execPath,
    ["--experimental-sqlite", ...process.execArgv, process.argv[1], ...process.argv.slice(2)],
    { stdio: "inherit" },
  );

  process.exit(result.status ?? 1);
}

// ── Library API ──────────────────────────────────────────────────────────────

export interface AgentOptions {
  workspace?: string;
  model?: string;
}

export interface ToolDefinition {
  description: string;
  parameters: Record<string, unknown>;
  execute: (params: Record<string, unknown>) => Promise<unknown>;
}

export interface Agent {
  run(prompt: string): Promise<string>;
  tools: {
    register(name: string, definition: ToolDefinition): void;
    unregister(name: string): void;
    list(): ToolDefinition[];
  };
  hooks: {
    on(event: string, handler: (...args: unknown[]) => void): void;
    off(event: string, handler: (...args: unknown[]) => void): void;
  };
}

export function createAgent(_options: AgentOptions = {}): Agent {
  return {
    async run(prompt: string): Promise<string> {
      return `[ghostpaw] received: ${prompt}`;
    },
    tools: {
      register(_name, _def) {},
      unregister(_name) {},
      list() {
        return [];
      },
    },
    hooks: {
      on(_event, _handler) {},
      off(_event, _handler) {},
    },
  };
}

// ── CLI ──────────────────────────────────────────────────────────────────────

function printHelp(): void {
  console.log(
    `
ghostpaw v${VERSION} — single-file AI agent runtime

Usage: ghostpaw [command] [options]

Commands:
  chat              Interactive chat (default)
  serve             Web UI + API server
  run <prompt>      One-shot prompt, exits when done
  init              Create workspace, configure API keys
  test              Run extension tests
  telegram          Start Telegram bot

Options:
  -h, --help        Show this help
  -v, --version     Show version
  -p, --port <n>    Port for serve command (default: 3000)
`.trim(),
  );
}

async function main(): Promise<void> {
  const { values, positionals } = parseArgs({
    allowPositionals: true,
    strict: false,
    options: {
      help: { type: "boolean", short: "h" },
      version: { type: "boolean", short: "v" },
      port: { type: "string", short: "p", default: "3000" },
    },
  });

  if (values.version) {
    console.log(VERSION);
    return;
  }

  if (values.help) {
    printHelp();
    return;
  }

  const command = positionals[0] ?? "chat";

  switch (command) {
    case "chat":
      console.log("ghostpaw interactive chat — not yet implemented");
      break;
    case "serve":
      console.log(`ghostpaw web UI on port ${values.port} — not yet implemented`);
      break;
    case "run": {
      const prompt = positionals.slice(1).join(" ");
      if (!prompt) {
        console.error('Usage: ghostpaw run "your prompt here"');
        process.exit(1);
      }
      console.log(`ghostpaw one-shot: "${prompt}" — not yet implemented`);
      break;
    }
    case "init":
      console.log("ghostpaw workspace init — not yet implemented");
      break;
    case "test":
      console.log("ghostpaw extension tests — not yet implemented");
      break;
    case "telegram":
      console.log("ghostpaw telegram bot — not yet implemented");
      break;
    default:
      console.error(`Unknown command: ${command}\n`);
      printHelp();
      process.exit(1);
  }
}

// ── Entry point ──────────────────────────────────────────────────────────────

if (isCLI()) {
  ensureSqliteFlag();
  main().catch((err: unknown) => {
    const msg = err instanceof Error ? err.message : String(err);
    console.error(`fatal: ${msg}`);
    process.exit(1);
  });
}

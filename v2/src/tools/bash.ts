import { spawnSync } from "node:child_process";
import { createTool, Schema } from "chatoyant";
import { KNOWN_KEYS } from "../core/secrets/api/read/index.ts";

const DEFAULT_TIMEOUT_S = 120;
const MAX_OUTPUT_BYTES = 100_000;

function scrubSecrets(text: string): string {
  if (!text) return text;
  let result = text;
  for (const k of KNOWN_KEYS) {
    for (const envName of [k.canonical, ...k.aliases]) {
      const val = process.env[envName];
      if (val && val.length >= 8) {
        result = result.replaceAll(val, "***");
      }
    }
  }
  return result;
}

function truncate(s: string): string {
  return s.length > MAX_OUTPUT_BYTES ? s.slice(0, MAX_OUTPUT_BYTES) : s;
}

class BashParams extends Schema {
  command = Schema.String({
    description:
      "Shell command to execute (passed to /bin/sh -c). Supports pipes, redirects, and chaining.",
  });
  timeout = Schema.Integer({
    description: `Timeout in seconds (default: ${DEFAULT_TIMEOUT_S}). Command is killed if it exceeds this.`,
    optional: true,
  });
}

export function createBashTool(workspace: string) {
  return createTool({
    name: "bash",
    description:
      "Execute a shell command. The working directory is the workspace root. Output is " +
      `automatically truncated at ${MAX_OUTPUT_BYTES} bytes and API key values are scrubbed. ` +
      `Default timeout: ${DEFAULT_TIMEOUT_S}s. Prefer dedicated tools (read, write, edit, ` +
      "grep, ls) for file operations — bash is for git, npm, build commands, and anything " +
      "the other tools cannot do.",
    // biome-ignore lint/suspicious/noExplicitAny: chatoyant SchemaInstance index-signature limitation
    parameters: new BashParams() as any,
    execute: async ({ args }) => {
      const { command, timeout } = args as { command: string; timeout?: number };

      if (!command || command.trim().length === 0) {
        return { error: "Command cannot be empty", exitCode: 1, stdout: "", stderr: "" };
      }

      const timeoutMs = (timeout && timeout > 0 ? timeout : DEFAULT_TIMEOUT_S) * 1000;

      const result = spawnSync("/bin/sh", ["-c", command], {
        cwd: workspace,
        timeout: timeoutMs,
        maxBuffer: MAX_OUTPUT_BYTES * 2,
        encoding: "utf-8",
        stdio: ["pipe", "pipe", "pipe"],
      });

      const timedOut = result.signal === "SIGTERM";
      const stdout = scrubSecrets(truncate(result.stdout ?? ""));
      const stderr = scrubSecrets(truncate(result.stderr ?? ""));
      const wasTruncated = (result.stdout?.length ?? 0) > MAX_OUTPUT_BYTES;

      if (timedOut) {
        return {
          exitCode: 124,
          stdout,
          stderr,
          truncated: wasTruncated,
          timedOut: true,
          error: `Command timed out after ${timeout ?? DEFAULT_TIMEOUT_S}s`,
        };
      }

      return {
        exitCode: result.status ?? 1,
        stdout,
        stderr,
        truncated: wasTruncated,
        timedOut: false,
      };
    },
  });
}

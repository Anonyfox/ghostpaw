import { spawnSync } from "node:child_process";
import { createTool, Schema } from "chatoyant";

const DEFAULT_TIMEOUT_S = 120;
const MAX_OUTPUT_BYTES = 100_000;

class BashParams extends Schema {
  command = Schema.String({ description: "Shell command to execute" });
  timeout = Schema.Integer({
    description: `Timeout in seconds (default: ${DEFAULT_TIMEOUT_S})`,
    optional: true,
  });
}

function truncate(s: string): string {
  return s.length > MAX_OUTPUT_BYTES ? s.slice(0, MAX_OUTPUT_BYTES) : s;
}

export function createBashTool(workspacePath: string) {
  return createTool({
    name: "bash",
    description: `Execute a shell command in the workspace directory. Default timeout: ${DEFAULT_TIMEOUT_S}s. Output is truncated at ${MAX_OUTPUT_BYTES} bytes.`,
    // biome-ignore lint: TS index-signature limitation on class instances vs SchemaInstance
    parameters: new BashParams() as any,
    execute: async ({ args }) => {
      const { command, timeout } = args as { command: string; timeout?: number };

      if (!command || command.trim().length === 0) {
        return { error: "Command cannot be empty", exitCode: 1, stdout: "", stderr: "" };
      }

      const timeoutMs = (timeout ?? DEFAULT_TIMEOUT_S) * 1000;

      const result = spawnSync("/bin/sh", ["-c", command], {
        cwd: workspacePath,
        timeout: timeoutMs,
        maxBuffer: MAX_OUTPUT_BYTES * 2,
        encoding: "utf-8",
        stdio: ["pipe", "pipe", "pipe"],
      });

      const timedOut = result.signal === "SIGTERM";
      const stdout = truncate(result.stdout ?? "");
      const stderr = truncate(result.stderr ?? "");
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

import { spawnSync } from "node:child_process";
import { platform } from "node:os";
import { createTool, Schema } from "chatoyant";
import { getSettingInt } from "../settings/get.ts";
import { getSecretValues } from "../settings/scrub.ts";
import { resolvePath } from "./resolve_path.ts";

function scrubSecrets(text: string, scrubValues: string[]): string {
  if (!text) return text;
  let result = text;
  for (const val of scrubValues) {
    if (val && val.length >= 8) {
      result = result.replaceAll(val, "***");
    }
  }
  return result;
}

class BashParams extends Schema {
  command = Schema.String({
    description:
      "Shell command to execute (passed to /bin/sh -c). Supports pipes, redirects, and chaining.",
  });
  cwd = Schema.String({
    description:
      "Working directory for the command. Supports ~, absolute, and relative paths. Defaults to workspace root.",
    optional: true,
  });
  timeout = Schema.Integer({
    description:
      "Timeout in seconds (default: from settings). Command is killed if it exceeds this.",
    optional: true,
  });
}

export function createBashTool(workspace: string) {
  return createTool({
    name: "bash",
    description:
      "Execute a shell command. The working directory is the workspace root. Output is " +
      "automatically truncated and API key values are scrubbed. " +
      "Prefer dedicated tools (read, write, edit, grep, ls) for file operations — bash " +
      "is for git, npm, build commands, and anything the other tools cannot do.",
    // biome-ignore lint/suspicious/noExplicitAny: chatoyant SchemaInstance index-signature limitation
    parameters: new BashParams() as any,
    execute: async ({ args }) => {
      const { command, cwd, timeout } = args as {
        command: string;
        cwd?: string;
        timeout?: number;
      };

      if (!command || command.trim().length === 0) {
        return { error: "Command cannot be empty", exitCode: 1, stdout: "", stderr: "" };
      }

      const defaultTimeout = getSettingInt("GHOSTPAW_BASH_TIMEOUT_S") ?? 120;
      const maxOutput = getSettingInt("GHOSTPAW_BASH_MAX_OUTPUT") ?? 100_000;
      const effectiveCwd = cwd ? resolvePath(workspace, cwd).fullPath : workspace;
      const timeoutMs = (timeout && timeout > 0 ? timeout : defaultTimeout) * 1000;

      const isWindows = platform() === "win32";
      const shell = isWindows ? "cmd.exe" : "/bin/sh";
      const shellArgs = isWindows ? ["/d", "/s", "/c", command] : ["-c", command];

      const truncate = (s: string): string => (s.length > maxOutput ? s.slice(0, maxOutput) : s);

      const result = spawnSync(shell, shellArgs, {
        cwd: effectiveCwd,
        timeout: timeoutMs,
        maxBuffer: maxOutput * 2,
        encoding: "utf-8",
        stdio: ["pipe", "pipe", "pipe"],
      });

      const currentScrubValues = getSecretValues();
      const timedOut = result.signal === "SIGTERM";
      const rawStdout = result.stdout ?? "";
      const rawStderr = result.stderr ?? "";
      const stdout = scrubSecrets(truncate(rawStdout), currentScrubValues);
      const stderr = scrubSecrets(truncate(rawStderr), currentScrubValues);
      const wasTruncated = rawStdout.length > maxOutput || rawStderr.length > maxOutput;

      if (timedOut) {
        return {
          exitCode: 124,
          stdout,
          stderr,
          truncated: wasTruncated,
          timedOut: true,
          error: `Command timed out after ${timeout ?? defaultTimeout}s`,
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

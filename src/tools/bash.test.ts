import { ok, strictEqual } from "node:assert";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, it } from "node:test";

import { createBashTool } from "./bash.js";

let workDir: string;
let bashTool: ReturnType<typeof createBashTool>;

async function exec(args: Record<string, unknown>) {
  return bashTool.execute({ args } as Parameters<typeof bashTool.execute>[0]);
}

beforeEach(() => {
  workDir = mkdtempSync(join(tmpdir(), "ghostpaw-bash-"));
  bashTool = createBashTool(workDir);
});

afterEach(() => {
  rmSync(workDir, { recursive: true, force: true });
});

describe("Bash tool", () => {
  it("has correct tool metadata", () => {
    strictEqual(bashTool.name, "bash");
    ok(bashTool.description.length > 0);
  });

  it("executes a simple command and captures stdout", async () => {
    const result = (await exec({ command: "echo hello" })) as {
      exitCode: number;
      stdout: string;
    };
    strictEqual(result.exitCode, 0);
    ok(result.stdout.includes("hello"));
  });

  it("captures stderr", async () => {
    const result = (await exec({ command: "echo err >&2" })) as {
      exitCode: number;
      stderr: string;
    };
    strictEqual(result.exitCode, 0);
    ok(result.stderr.includes("err"));
  });

  it("reports non-zero exit code", async () => {
    const result = (await exec({ command: "exit 42" })) as { exitCode: number };
    strictEqual(result.exitCode, 42);
  });

  it("executes in the workspace directory", async () => {
    const result = (await exec({ command: "pwd" })) as { stdout: string };
    const expectedDir = workDir;
    ok(
      result.stdout.trim().endsWith(expectedDir) || result.stdout.trim() === expectedDir,
      `Expected pwd to be ${expectedDir}, got ${result.stdout.trim()}`,
    );
  });

  it("handles commands with pipes", async () => {
    const result = (await exec({ command: "echo 'aaa\nbbb\nccc' | grep bbb" })) as {
      stdout: string;
      exitCode: number;
    };
    strictEqual(result.exitCode, 0);
    ok(result.stdout.includes("bbb"));
  });

  it("enforces timeout", async () => {
    const result = (await exec({ command: "sleep 30", timeout: 1 })) as {
      error: string;
      timedOut: boolean;
    };
    ok(result.timedOut);
    ok(result.error?.toLowerCase().includes("timeout") || result.timedOut === true);
  });

  it("truncates very large output", async () => {
    const result = (await exec({ command: "yes | head -100000" })) as {
      stdout: string;
      truncated: boolean;
    };
    ok(result.stdout.length <= 100_001);
  });

  it("handles empty command gracefully", async () => {
    const result = (await exec({ command: "" })) as { error?: string };
    ok(result.error || result);
  });

  it("handles command with special characters", async () => {
    const result = (await exec({ command: `echo 'quotes "and" special $chars'` })) as {
      stdout: string;
      exitCode: number;
    };
    strictEqual(result.exitCode, 0);
    ok(result.stdout.includes("quotes"));
  });

  it("respects custom timeout", async () => {
    const start = Date.now();
    await exec({ command: "sleep 10", timeout: 2 });
    const elapsed = Date.now() - start;
    ok(elapsed < 5000, `Should timeout quickly, took ${elapsed}ms`);
  });

  it("scrubs known API key values from stdout", async () => {
    const original = process.env.API_KEY_ANTHROPIC;
    process.env.API_KEY_ANTHROPIC = "sk-ant-test-secret-value-12345678";
    try {
      const result = (await exec({
        command: "echo sk-ant-test-secret-value-12345678",
      })) as { stdout: string };
      strictEqual(result.stdout.includes("sk-ant-test-secret-value-12345678"), false);
      ok(result.stdout.includes("***"));
    } finally {
      if (original === undefined) delete process.env.API_KEY_ANTHROPIC;
      else process.env.API_KEY_ANTHROPIC = original;
    }
  });

  it("scrubs known API key values from stderr", async () => {
    const original = process.env.TAVILY_API_KEY;
    process.env.TAVILY_API_KEY = "tvly-test-secret-value-87654321";
    try {
      const result = (await exec({
        command: "echo tvly-test-secret-value-87654321 >&2",
      })) as { stderr: string };
      strictEqual(result.stderr.includes("tvly-test-secret-value-87654321"), false);
      ok(result.stderr.includes("***"));
    } finally {
      if (original === undefined) delete process.env.TAVILY_API_KEY;
      else process.env.TAVILY_API_KEY = original;
    }
  });

  it("does not scrub short values (under 8 chars)", async () => {
    const original = process.env.SERPER_API_KEY;
    process.env.SERPER_API_KEY = "short";
    try {
      const result = (await exec({ command: "echo short" })) as { stdout: string };
      ok(result.stdout.includes("short"));
    } finally {
      if (original === undefined) delete process.env.SERPER_API_KEY;
      else process.env.SERPER_API_KEY = original;
    }
  });
});

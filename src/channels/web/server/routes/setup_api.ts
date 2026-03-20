import { execFile } from "node:child_process";
import { platform } from "node:os";
import { listSecretStatus } from "../../../../core/secrets/api/read/index.ts";
import type { DatabaseHandle } from "../../../../lib/index.ts";
import { fetchProviderModels } from "../../../../lib/models/fetch_provider_models.ts";
import { isProviderId } from "../../../../lib/models/types.ts";
import { readJsonBody } from "../body_parser.ts";
import type { RouteContext } from "../types.ts";

function json(ctx: RouteContext, status: number, data: unknown): void {
  ctx.res.writeHead(status, { "Content-Type": "application/json" });
  ctx.res.end(JSON.stringify(data));
}

export function createSetupApiHandlers(db: DatabaseHandle) {
  return {
    status(ctx: RouteContext): void {
      const secrets = listSecretStatus(db);
      const hasLlmKey = secrets.some((s) => s.category === "llm" && s.configured);
      const hasSearchKey = secrets.some((s) => s.category === "search" && s.configured);
      json(ctx, 200, { hasLlmKey, hasSearchKey, secrets });
    },

    async testKey(ctx: RouteContext): Promise<void> {
      let body: unknown;
      try {
        body = await readJsonBody(ctx.req);
      } catch {
        json(ctx, 400, { error: "Invalid request body." });
        return;
      }

      if (typeof body !== "object" || body === null) {
        json(ctx, 400, { error: "Invalid request body." });
        return;
      }

      const { provider, key } = body as Record<string, unknown>;
      if (typeof provider !== "string" || !isProviderId(provider)) {
        json(ctx, 400, { error: "Invalid provider." });
        return;
      }
      if (typeof key !== "string" || !key.trim()) {
        json(ctx, 400, { error: "Missing API key." });
        return;
      }

      try {
        const result = await fetchProviderModels(provider, key.trim(), { timeoutMs: 10_000 });
        if (result.source === "live") {
          json(ctx, 200, { ok: true, models: result.models.length });
        } else {
          json(ctx, 200, { ok: false, error: result.error ?? "Could not verify key." });
        }
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        json(ctx, 200, { ok: false, error: msg });
      }
    },

    async envCheck(ctx: RouteContext): Promise<void> {
      const os = platform();
      const checks = await runEnvChecks(os);
      json(ctx, 200, { platform: os, checks });
    },
  };
}

interface EnvCheckResult {
  name: string;
  command: string;
  found: boolean;
  version: string | null;
  hint: string | null;
}

function tryCommand(cmd: string, args: string[]): Promise<string | null> {
  return new Promise((resolve) => {
    execFile(cmd, args, { timeout: 5000, encoding: "utf-8" }, (err, stdout) => {
      resolve(err ? null : (stdout as string).trim());
    });
  });
}

async function runEnvChecks(os: string): Promise<EnvCheckResult[]> {
  const [gitVersion, nodeVersion, pythonVersion, dockerVersion] = await Promise.all([
    tryCommand("git", ["--version"]),
    tryCommand("node", ["--version"]),
    tryCommand("python3", ["--version"]),
    tryCommand("docker", ["--version"]),
  ]);

  const checks: EnvCheckResult[] = [
    {
      name: "Git",
      command: "git --version",
      found: gitVersion !== null,
      version: gitVersion,
      hint: gitVersion
        ? null
        : os === "darwin"
          ? "Run: xcode-select --install"
          : os === "win32"
            ? "Download from https://git-scm.com/download/win"
            : "Run: sudo apt install git",
    },
    {
      name: "Node.js",
      command: "node --version",
      found: nodeVersion !== null,
      version: nodeVersion,
      hint: nodeVersion ? null : "Download from https://nodejs.org",
    },
  ];

  if (os === "darwin") {
    const brewVersion = await tryCommand("brew", ["--version"]);
    checks.push({
      name: "Homebrew",
      command: "brew --version",
      found: brewVersion !== null,
      version: brewVersion?.split("\n")[0] ?? null,
      hint: brewVersion
        ? null
        : 'Install: /bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"',
    });
  } else if (os === "win32") {
    const wingetVersion = await tryCommand("winget", ["--version"]);
    checks.push({
      name: "winget",
      command: "winget --version",
      found: wingetVersion !== null,
      version: wingetVersion,
      hint: wingetVersion ? null : "Install from the Microsoft Store (App Installer)",
    });
  } else {
    const aptVersion = await tryCommand("apt", ["--version"]);
    checks.push({
      name: "apt",
      command: "apt --version",
      found: aptVersion !== null,
      version: aptVersion?.split("\n")[0] ?? null,
      hint: null,
    });
  }

  checks.push(
    {
      name: "Python 3",
      command: "python3 --version",
      found: pythonVersion !== null,
      version: pythonVersion,
      hint: null,
    },
    {
      name: "Docker",
      command: "docker --version",
      found: dockerVersion !== null,
      version: dockerVersion,
      hint: null,
    },
  );

  return checks;
}

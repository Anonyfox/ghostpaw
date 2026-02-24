import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { ConfigError, ValidationError } from "../lib/errors.js";

export interface CostControls {
  maxTokensPerSession: number;
  maxTokensPerDay: number;
  warnAtPercentage: number;
}

export interface GhostpawConfig {
  models: { default: string };
  costControls: CostControls;
}

export const DEFAULT_CONFIG: GhostpawConfig = {
  models: {
    default: "claude-sonnet-4-6",
  },
  costControls: {
    maxTokensPerSession: 200_000,
    maxTokensPerDay: 1_000_000,
    warnAtPercentage: 80,
  },
};

export async function loadConfig(workspacePath: string): Promise<GhostpawConfig> {
  const base = structuredClone(DEFAULT_CONFIG);
  const configPath = join(workspacePath, "config.json");

  if (existsSync(configPath)) {
    let raw: string;
    try {
      raw = readFileSync(configPath, "utf-8");
    } catch (err) {
      throw new ConfigError(`Failed to read ${configPath}`, { cause: err });
    }

    let parsed: unknown;
    try {
      parsed = JSON.parse(raw);
    } catch (err) {
      throw new ConfigError(`Failed to parse ${configPath}: invalid JSON`, {
        cause: err,
        hint: "Ensure config.json contains valid JSON.",
      });
    }

    if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) {
      throw new ConfigError("config.json must be a JSON object", {
        hint: 'Expected format: { "models": { ... }, "costControls": { ... } }',
      });
    }

    const file = parsed as Record<string, unknown>;
    if (file.models && typeof file.models === "object") Object.assign(base.models, file.models);
    if (file.costControls && typeof file.costControls === "object")
      Object.assign(base.costControls, file.costControls);
  }

  const { costControls } = base;

  if (costControls.maxTokensPerSession <= 0) {
    throw new ValidationError(
      "maxTokensPerSession",
      costControls.maxTokensPerSession,
      "must be positive",
    );
  }
  if (costControls.maxTokensPerDay <= 0) {
    throw new ValidationError("maxTokensPerDay", costControls.maxTokensPerDay, "must be positive");
  }
  if (costControls.warnAtPercentage < 0 || costControls.warnAtPercentage > 100) {
    throw new ValidationError(
      "warnAtPercentage",
      costControls.warnAtPercentage,
      "must be between 0 and 100",
    );
  }

  return base;
}

export function saveConfig(workspacePath: string, config: GhostpawConfig): void {
  const configPath = join(workspacePath, "config.json");
  writeFileSync(configPath, `${JSON.stringify(config, null, 2)}\n`, "utf-8");
}

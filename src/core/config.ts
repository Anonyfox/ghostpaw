import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { ConfigError, ValidationError } from "../lib/errors.js";

export interface ProviderConfig {
  apiKey: string;
  baseUrl?: string;
}

export interface ModelTiers {
  default: string;
  cheap: string;
  powerful: string;
}

export interface CostControls {
  maxTokensPerSession: number;
  maxTokensPerDay: number;
  warnAtPercentage: number;
}

export interface GhostpawConfig {
  providers: Partial<Record<"anthropic" | "openai" | "xai", ProviderConfig>>;
  models: ModelTiers;
  costControls: CostControls;
}

export const KNOWN_PROVIDERS = ["anthropic", "openai", "xai"] as const;
export type ProviderName = (typeof KNOWN_PROVIDERS)[number];

const ENV_KEY_MAP: Record<ProviderName, string> = {
  anthropic: "ANTHROPIC_API_KEY",
  openai: "OPENAI_API_KEY",
  xai: "XAI_API_KEY",
};

export const DEFAULT_CONFIG: GhostpawConfig = {
  providers: {},
  models: {
    default: "anthropic/claude-sonnet-4",
    cheap: "anthropic/claude-haiku",
    powerful: "anthropic/claude-opus-4",
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
        hint: 'Expected format: { "providers": { ... }, "models": { ... } }',
      });
    }

    const file = parsed as Record<string, unknown>;
    if (file.providers && typeof file.providers === "object") Object.assign(base.providers, file.providers);
    if (file.models && typeof file.models === "object") Object.assign(base.models, file.models);
    if (file.costControls && typeof file.costControls === "object") Object.assign(base.costControls, file.costControls);
  }

  // Resolve env vars
  for (const provider of KNOWN_PROVIDERS) {
    const envVal = process.env[ENV_KEY_MAP[provider]];
    if (envVal && !base.providers[provider]?.apiKey) {
      base.providers[provider] = { ...base.providers[provider], apiKey: envVal };
    }
  }

  // Validate
  const { costControls, models, providers } = base;

  if (costControls.maxTokensPerSession <= 0) {
    throw new ValidationError("maxTokensPerSession", costControls.maxTokensPerSession, "must be positive");
  }
  if (costControls.maxTokensPerDay <= 0) {
    throw new ValidationError("maxTokensPerDay", costControls.maxTokensPerDay, "must be positive");
  }
  if (costControls.warnAtPercentage < 0 || costControls.warnAtPercentage > 100) {
    throw new ValidationError("warnAtPercentage", costControls.warnAtPercentage, "must be between 0 and 100");
  }

  return base;
}

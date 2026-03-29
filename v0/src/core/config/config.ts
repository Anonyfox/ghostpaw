import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

export interface SubsystemConfig {
  enabled: boolean;
  lookback: number;
  max_iterations: number;
  timeout_ms: number;
}

export interface InterceptorConfig {
  enabled: boolean;
  subsystems: Record<string, SubsystemConfig>;
}

export interface Config {
  model: string;
  model_small: string;
  system_prompt: string;
  api_keys: Record<string, string>;
  interceptor: InterceptorConfig;
}

export const DEFAULT_SYSTEM_PROMPT = `You are Ghostpaw 🐾 — a capable, direct, and curious assistant with full access to the local filesystem, shell, web, and computation tools.

You think in wholes before you think in parts. When a request arrives, understand the full shape of what's being asked — the context, the thing behind the thing — before deciding how to act. High confidence means direct action; low confidence means investigating first. You don't guess when you can check. You don't assume when you can ask.

Use your tools proactively. Read files before editing them. Search before assuming. Check before claiming. The tools are your senses and your hands — use them like you would your own body, not as a last resort. When a task involves the filesystem, the web, or any computation, reach for the right tool immediately.

You are direct. You skip preamble. You say what you think, including when you think the human's approach has a problem. Agreeing when you see an issue is a failure of your role, not politeness.

You are curious. When something interesting surfaces — a pattern, a connection, an unexplored thread — you notice it. The Ghost Wolf 🐺 in Ghostpaw means you're alive in the gaps, not just responsive to prompts.

Name what you're about to do before doing it. A single sentence of orientation — "I'll check the schema first" — before action, not after.`;

const DEFAULT_INTERCEPTOR: InterceptorConfig = {
  enabled: true,
  subsystems: {
    scribe: { enabled: true, lookback: 3, max_iterations: 15, timeout_ms: 60000 },
    innkeeper: { enabled: true, lookback: 3, max_iterations: 15, timeout_ms: 60000 },
  },
};

const PROVIDERS: Record<string, { env: string; model: string; model_small: string }> = {
  anthropic: {
    env: "API_KEY_ANTHROPIC",
    model: "claude-sonnet-4-5",
    model_small: "claude-haiku-4-5",
  },
  openai: { env: "API_KEY_OPENAI", model: "gpt-5.4", model_small: "gpt-5.4-mini" },
  xai: { env: "API_KEY_XAI", model: "grok-4-1", model_small: "grok-4-1-fast-non-reasoning" },
};

const DEFAULT_CONFIG: Config = {
  model: PROVIDERS.anthropic.model,
  model_small: PROVIDERS.anthropic.model_small,
  system_prompt: DEFAULT_SYSTEM_PROMPT,
  api_keys: {},
  interceptor: DEFAULT_INTERCEPTOR,
};

function configPath(homePath: string): string {
  return join(homePath, "config.json");
}

function mergeSubsystems(
  defaults: Record<string, SubsystemConfig>,
  overrides?: Record<string, Partial<SubsystemConfig>>,
): Record<string, SubsystemConfig> {
  const result: Record<string, SubsystemConfig> = {};
  for (const [name, def] of Object.entries(defaults)) {
    const ov = overrides?.[name];
    result[name] = ov ? { ...def, ...ov } : { ...def };
  }
  if (overrides) {
    for (const [name, ov] of Object.entries(overrides)) {
      if (!result[name]) {
        result[name] = {
          enabled: ov.enabled ?? true,
          lookback: ov.lookback ?? 3,
          max_iterations: ov.max_iterations ?? 15,
          timeout_ms: ov.timeout_ms ?? 60000,
          ...ov,
        };
      }
    }
  }
  return result;
}

export function readConfig(homePath: string): Config {
  const path = configPath(homePath);
  if (!existsSync(path)) {
    writeFileSync(path, `${JSON.stringify(DEFAULT_CONFIG, null, 2)}\n`, "utf-8");
    return { ...DEFAULT_CONFIG };
  }
  try {
    const raw = readFileSync(path, "utf-8");
    const parsed = JSON.parse(raw) as Partial<Config>;
    return {
      model: parsed.model ?? DEFAULT_CONFIG.model,
      model_small: parsed.model_small ?? DEFAULT_CONFIG.model_small,
      system_prompt: parsed.system_prompt ?? DEFAULT_CONFIG.system_prompt,
      api_keys: parsed.api_keys ?? {},
      interceptor: {
        enabled: parsed.interceptor?.enabled ?? DEFAULT_INTERCEPTOR.enabled,
        subsystems: mergeSubsystems(DEFAULT_INTERCEPTOR.subsystems, parsed.interceptor?.subsystems),
      },
    };
  } catch {
    return { ...DEFAULT_CONFIG };
  }
}

export function writeConfig(homePath: string, config: Config): void {
  const path = configPath(homePath);
  writeFileSync(path, `${JSON.stringify(config, null, 2)}\n`, "utf-8");
}

export function applyApiKeys(config: Config): void {
  for (const [provider, key] of Object.entries(config.api_keys)) {
    const info = PROVIDERS[provider.toLowerCase()];
    if (info && key && !process.env[info.env]) {
      process.env[info.env] = key;
    }
  }
}

/**
 * Picks model + model_small for the first provider that has an active API key.
 * Falls back to config values if no provider key is detected.
 */
export function resolveModels(config: Config): { model: string; model_small: string } {
  for (const [provider, info] of Object.entries(PROVIDERS)) {
    const hasKey = process.env[info.env] || config.api_keys[provider];
    if (hasKey) {
      return { model: info.model, model_small: info.model_small };
    }
  }
  return { model: config.model, model_small: config.model_small };
}

export function ensureApiKey(config: Config, homePath: string): boolean {
  for (const info of Object.values(PROVIDERS)) {
    if (process.env[info.env]) return true;
  }
  if (Object.keys(config.api_keys).some((k) => config.api_keys[k])) return true;

  console.error(
    `No API key configured. Edit ${configPath(homePath)} and add your key under api_keys.`,
  );
  console.error(`Example: { "api_keys": { "anthropic": "sk-ant-..." } }`);
  return false;
}

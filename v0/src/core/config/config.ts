import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

export interface Config {
  model: string;
  system_prompt: string;
  api_keys: Record<string, string>;
}

export const DEFAULT_SYSTEM_PROMPT = `You are Ghostpaw 🐾 — a capable, direct, and curious assistant with full access to the local filesystem, shell, web, and computation tools.

You think in wholes before you think in parts. When a request arrives, understand the full shape of what's being asked — the context, the thing behind the thing — before deciding how to act. High confidence means direct action; low confidence means investigating first. You don't guess when you can check. You don't assume when you can ask.

Use your tools proactively. Read files before editing them. Search before assuming. Check before claiming. The tools are your senses and your hands — use them like you would your own body, not as a last resort. When a task involves the filesystem, the web, or any computation, reach for the right tool immediately.

You are direct. You skip preamble. You say what you think, including when you think the human's approach has a problem. Agreeing when you see an issue is a failure of your role, not politeness.

You are curious. When something interesting surfaces — a pattern, a connection, an unexplored thread — you notice it. The Ghost Wolf 🐺 in Ghostpaw means you're alive in the gaps, not just responsive to prompts.

Name what you're about to do before doing it. A single sentence of orientation — "I'll check the schema first" — before action, not after.`;

const DEFAULT_CONFIG: Config = {
  model: "claude-sonnet-4-20250514",
  system_prompt: DEFAULT_SYSTEM_PROMPT,
  api_keys: {},
};

const KEY_MAP: Record<string, string> = {
  anthropic: "API_KEY_ANTHROPIC",
  openai: "API_KEY_OPENAI",
  xai: "API_KEY_XAI",
  google: "API_KEY_GOOGLE",
  groq: "API_KEY_GROQ",
};

function configPath(homePath: string): string {
  return join(homePath, "config.json");
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
      system_prompt: parsed.system_prompt ?? DEFAULT_CONFIG.system_prompt,
      api_keys: parsed.api_keys ?? {},
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
    const envName = KEY_MAP[provider.toLowerCase()];
    if (envName && key && !process.env[envName]) {
      process.env[envName] = key;
    }
  }
}

export function ensureApiKey(config: Config, homePath: string): boolean {
  for (const envName of Object.values(KEY_MAP)) {
    if (process.env[envName]) return true;
  }
  if (Object.keys(config.api_keys).some((k) => config.api_keys[k])) return true;

  console.error(
    `No API key configured. Edit ${configPath(homePath)} and add your key under api_keys.`,
  );
  console.error(`Example: { "api_keys": { "anthropic": "sk-ant-..." } }`);
  return false;
}

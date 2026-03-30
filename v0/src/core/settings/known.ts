import type { KnownSetting } from "./types.ts";

function crossSlotValidator(name: string, wrongPrefixes: { prefix: string; owner: string }[]) {
  return (v: string): string | null => {
    for (const { prefix, owner } of wrongPrefixes) {
      if (v.startsWith(prefix)) {
        return `This looks like a ${owner} key (starts with "${prefix}"), not a ${name} key. Did you mean to set ${owner}?`;
      }
    }
    return null;
  };
}

export const KNOWN_SETTINGS: Record<string, KnownSetting> = {
  // --- provider (secret) ---
  ANTHROPIC_API_KEY: {
    type: "string",
    secret: true,
    category: "provider",
    description: "Anthropic API key",
    validate: crossSlotValidator("anthropic", [{ prefix: "xai-", owner: "XAI_API_KEY" }]),
  },
  OPENAI_API_KEY: {
    type: "string",
    secret: true,
    category: "provider",
    description: "OpenAI API key",
    validate: crossSlotValidator("openai", [
      { prefix: "sk-ant-", owner: "ANTHROPIC_API_KEY" },
      { prefix: "xai-", owner: "XAI_API_KEY" },
    ]),
  },
  XAI_API_KEY: {
    type: "string",
    secret: true,
    category: "provider",
    description: "xAI API key",
    validate: crossSlotValidator("xai", [{ prefix: "sk-ant-", owner: "ANTHROPIC_API_KEY" }]),
  },

  // --- search (secret) ---
  BRAVE_API_KEY: {
    type: "string",
    secret: true,
    category: "search",
    description: "Brave Search API key",
  },
  TAVILY_API_KEY: {
    type: "string",
    secret: true,
    category: "search",
    description: "Tavily Search API key",
  },
  SERPER_API_KEY: {
    type: "string",
    secret: true,
    category: "search",
    description: "Serper Search API key",
  },

  // --- channel (secret) ---
  TELEGRAM_BOT_TOKEN: {
    type: "string",
    secret: true,
    category: "channel",
    description: "Telegram bot token",
  },

  // --- model ---
  GHOSTPAW_MODEL: {
    defaultValue: "claude-sonnet-4-5",
    type: "string",
    secret: false,
    category: "model",
    description: "Default LLM model for chat turns",
  },
  GHOSTPAW_MODEL_SMALL: {
    defaultValue: "claude-haiku-4-5",
    type: "string",
    secret: false,
    category: "model",
    description: "Smaller/cheaper model for trivial tasks and oneshots",
  },
  GHOSTPAW_MODEL_LARGE: {
    defaultValue: "claude-opus-4-5",
    type: "string",
    secret: false,
    category: "model",
    description: "Heavyweight model for complex reasoning and high-stakes tasks",
  },

  GHOSTPAW_COMPACTION_THRESHOLD: {
    defaultValue: "180000",
    type: "integer",
    secret: false,
    category: "agent",
    description: "Token count at which automatic chat compaction fires (0 disables)",
  },

  // --- agent ---
  GHOSTPAW_MAX_TURN_ITERATIONS: {
    defaultValue: "25",
    type: "integer",
    secret: false,
    category: "agent",
    description: "Maximum tool call iterations per chat turn",
  },
  GHOSTPAW_BASH_TIMEOUT_S: {
    defaultValue: "120",
    type: "integer",
    secret: false,
    category: "agent",
    description: "Default bash command timeout in seconds",
  },
  GHOSTPAW_BASH_MAX_OUTPUT: {
    defaultValue: "100000",
    type: "integer",
    secret: false,
    category: "agent",
    description: "Maximum bash output bytes before truncation",
  },
  GHOSTPAW_ONESHOT_TIMEOUT_MS: {
    defaultValue: "60000",
    type: "integer",
    secret: false,
    category: "agent",
    description: "Timeout for oneshot operations (title generation, etc.)",
  },
  GHOSTPAW_DELEGATION_TIMEOUT_MS: {
    defaultValue: "3600000",
    type: "integer",
    secret: false,
    category: "agent",
    description: "Timeout for delegation tool execution (delegate and ask_mentor) in milliseconds",
  },

  // --- interceptor ---
  GHOSTPAW_INTERCEPTOR_ENABLED: {
    defaultValue: "true",
    type: "boolean",
    secret: false,
    category: "interceptor",
    description: "Enable/disable subsystem interceptors globally",
  },
  GHOSTPAW_SCRIBE_ENABLED: {
    defaultValue: "true",
    type: "boolean",
    secret: false,
    category: "interceptor",
    description: "Enable/disable the scribe subsystem",
  },
  GHOSTPAW_SCRIBE_LOOKBACK: {
    defaultValue: "3",
    type: "integer",
    secret: false,
    category: "interceptor",
    description: "Number of recent messages the scribe analyzes",
  },
  GHOSTPAW_SCRIBE_MAX_ITERATIONS: {
    defaultValue: "15",
    type: "integer",
    secret: false,
    category: "interceptor",
    description: "Max tool call iterations for scribe subagent",
  },
  GHOSTPAW_SCRIBE_TIMEOUT_MS: {
    defaultValue: "60000",
    type: "integer",
    secret: false,
    category: "interceptor",
    description: "Scribe subagent timeout in milliseconds",
  },
  GHOSTPAW_INNKEEPER_ENABLED: {
    defaultValue: "true",
    type: "boolean",
    secret: false,
    category: "interceptor",
    description: "Enable/disable the innkeeper subsystem",
  },
  GHOSTPAW_INNKEEPER_LOOKBACK: {
    defaultValue: "3",
    type: "integer",
    secret: false,
    category: "interceptor",
    description: "Number of recent messages the innkeeper analyzes",
  },
  GHOSTPAW_INNKEEPER_MAX_ITERATIONS: {
    defaultValue: "15",
    type: "integer",
    secret: false,
    category: "interceptor",
    description: "Max tool call iterations for innkeeper subagent",
  },
  GHOSTPAW_INNKEEPER_TIMEOUT_MS: {
    defaultValue: "60000",
    type: "integer",
    secret: false,
    category: "interceptor",
    description: "Innkeeper subagent timeout in milliseconds",
  },

  // --- pulse ---
  GHOSTPAW_PULSE_TICK_MS: {
    defaultValue: "60000",
    type: "integer",
    secret: false,
    category: "pulse",
    description: "Pulse engine tick interval in milliseconds",
  },
  GHOSTPAW_PULSE_MAX_CONCURRENT: {
    defaultValue: "5",
    type: "integer",
    secret: false,
    category: "pulse",
    description: "Maximum concurrent pulse jobs",
  },
  GHOSTPAW_PULSE_HISTORY_DAYS: {
    defaultValue: "7",
    type: "integer",
    secret: false,
    category: "pulse",
    description: "Days of pulse run history to retain",
  },
  GHOSTPAW_PULSE_STOP_WAIT_MS: {
    defaultValue: "1200000",
    type: "integer",
    secret: false,
    category: "pulse",
    description: "Maximum time to wait for active pulse jobs during shutdown (default 20 minutes)",
  },

  // --- tools ---
  GHOSTPAW_GREP_MAX_RESULTS: {
    defaultValue: "20",
    type: "integer",
    secret: false,
    category: "tools",
    description: "Default max grep results",
  },
  GHOSTPAW_LS_MAX_ENTRIES: {
    defaultValue: "500",
    type: "integer",
    secret: false,
    category: "tools",
    description: "Maximum directory listing entries",
  },
  GHOSTPAW_LS_MAX_DEPTH: {
    defaultValue: "5",
    type: "integer",
    secret: false,
    category: "tools",
    description: "Maximum directory listing recursion depth",
  },
};

export const PROVIDER_MODELS: Record<
  string,
  { model: string; model_small: string; model_large: string }
> = {
  anthropic: {
    model: "claude-sonnet-4-5",
    model_small: "claude-haiku-4-5",
    model_large: "claude-opus-4-5",
  },
  openai: {
    model: "gpt-5.4",
    model_small: "gpt-5.4-mini",
    model_large: "gpt-5.4-pro",
  },
  xai: {
    model: "grok-4-1",
    model_small: "grok-4-1-fast-non-reasoning",
    model_large: "grok-4.20-0309-reasoning",
  },
};

export const PROVIDER_KEYS: Record<string, string> = {
  anthropic: "ANTHROPIC_API_KEY",
  openai: "OPENAI_API_KEY",
  xai: "XAI_API_KEY",
};

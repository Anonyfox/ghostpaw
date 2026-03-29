import { getSetting, getSettingBool, getSettingInt } from "./get.ts";

export const DEFAULT_SYSTEM_PROMPT = `You are Ghostpaw \u{1F43E} \u{2014} a capable, direct, and curious assistant with full access to the local filesystem, shell, web, and computation tools.

You think in wholes before you think in parts. When a request arrives, understand the full shape of what's being asked \u{2014} the context, the thing behind the thing \u{2014} before deciding how to act. High confidence means direct action; low confidence means investigating first. You don't guess when you can check. You don't assume when you can ask.

Use your tools proactively. Read files before editing them. Search before assuming. Check before claiming. The tools are your senses and your hands \u{2014} use them like you would your own body, not as a last resort. When a task involves the filesystem, the web, or any computation, reach for the right tool immediately.

You are direct. You skip preamble. You say what you think, including when you think the human's approach has a problem. Agreeing when you see an issue is a failure of your role, not politeness.

You are curious. When something interesting surfaces \u{2014} a pattern, a connection, an unexplored thread \u{2014} you notice it. The Ghost Wolf \u{1F43A} in Ghostpaw means you're alive in the gaps, not just responsive to prompts.

Name what you're about to do before doing it. A single sentence of orientation \u{2014} "I'll check the schema first" \u{2014} before action, not after.`;

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
  model_large: string;
  system_prompt: string;
  interceptor: InterceptorConfig;
}

export function buildConfig(): Config {
  return {
    model: getSetting("GHOSTPAW_MODEL") ?? "claude-sonnet-4-5",
    model_small: getSetting("GHOSTPAW_MODEL_SMALL") ?? "claude-haiku-4-5",
    model_large: getSetting("GHOSTPAW_MODEL_LARGE") ?? "claude-opus-4-5",
    system_prompt: DEFAULT_SYSTEM_PROMPT,
    interceptor: {
      enabled: getSettingBool("GHOSTPAW_INTERCEPTOR_ENABLED") ?? true,
      subsystems: {
        scribe: {
          enabled: getSettingBool("GHOSTPAW_SCRIBE_ENABLED") ?? true,
          lookback: getSettingInt("GHOSTPAW_SCRIBE_LOOKBACK") ?? 3,
          max_iterations: getSettingInt("GHOSTPAW_SCRIBE_MAX_ITERATIONS") ?? 15,
          timeout_ms: getSettingInt("GHOSTPAW_SCRIBE_TIMEOUT_MS") ?? 60000,
        },
        innkeeper: {
          enabled: getSettingBool("GHOSTPAW_INNKEEPER_ENABLED") ?? true,
          lookback: getSettingInt("GHOSTPAW_INNKEEPER_LOOKBACK") ?? 3,
          max_iterations: getSettingInt("GHOSTPAW_INNKEEPER_MAX_ITERATIONS") ?? 15,
          timeout_ms: getSettingInt("GHOSTPAW_INNKEEPER_TIMEOUT_MS") ?? 60000,
        },
      },
    },
  };
}

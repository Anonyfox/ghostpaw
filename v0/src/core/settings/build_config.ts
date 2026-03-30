import { getSetting, getSettingBool, getSettingInt } from "./get.ts";

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
  compaction_threshold: number;
  delegation_timeout_ms: number;
  pulse_stop_wait_ms: number;
  interceptor: InterceptorConfig;
}

export function buildConfig(): Config {
  return {
    model: getSetting("GHOSTPAW_MODEL") ?? "claude-sonnet-4-5",
    model_small: getSetting("GHOSTPAW_MODEL_SMALL") ?? "claude-haiku-4-5",
    model_large: getSetting("GHOSTPAW_MODEL_LARGE") ?? "claude-opus-4-5",
    compaction_threshold: getSettingInt("GHOSTPAW_COMPACTION_THRESHOLD") ?? 180_000,
    delegation_timeout_ms: getSettingInt("GHOSTPAW_DELEGATION_TIMEOUT_MS") ?? 3_600_000,
    pulse_stop_wait_ms: getSettingInt("GHOSTPAW_PULSE_STOP_WAIT_MS") ?? 1_200_000,
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

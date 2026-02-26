import type { KnownConfigKey } from "./types.ts";

export const KNOWN_CONFIG_KEYS: KnownConfigKey[] = [
  {
    key: "default_model",
    type: "string",
    defaultValue: "claude-sonnet-4-6",
    category: "model",
    label: "Default Model",
  },
  {
    key: "max_tokens_per_session",
    type: "integer",
    defaultValue: 200_000,
    category: "cost",
    label: "Max Tokens Per Session",
    validate: (v) => typeof v === "number" && v > 0,
  },
  {
    key: "max_tokens_per_day",
    type: "integer",
    defaultValue: 1_000_000,
    category: "cost",
    label: "Max Tokens Per Day",
    validate: (v) => typeof v === "number" && v > 0,
  },
  {
    key: "warn_at_percentage",
    type: "integer",
    defaultValue: 80,
    category: "cost",
    label: "Warning Threshold (%)",
    validate: (v) => typeof v === "number" && v >= 0 && v <= 100,
  },
  {
    key: "max_cost_per_day",
    type: "number",
    defaultValue: 0,
    category: "cost",
    label: "Max Cost Per Day (USD)",
    validate: (v) => typeof v === "number" && v >= 0,
  },
];

export const CONFIG_TYPES = ["string", "integer", "number", "boolean"] as const;
export type ConfigType = (typeof CONFIG_TYPES)[number];

export const CONFIG_CATEGORIES = [
  "model",
  "cost",
  "behavior",
  "souls",
  "telegram",
  "custom",
] as const;
export type ConfigCategory = (typeof CONFIG_CATEGORIES)[number];

export const CONFIG_SOURCES = ["cli", "web", "agent", "env", "import", "default"] as const;
export type ConfigSource = (typeof CONFIG_SOURCES)[number];

export type ConfigValue = string | number | boolean;

export interface ConfigEntry {
  id: number;
  key: string;
  value: string;
  type: ConfigType;
  category: ConfigCategory;
  source: ConfigSource;
  nextId: number | null;
  updatedAt: number;
}

export interface KnownConfigKey {
  key: string;
  type: ConfigType;
  defaultValue: ConfigValue;
  category: Exclude<ConfigCategory, "custom">;
  label: string;
  description: string;
  validate?: (value: ConfigValue) => boolean;
}

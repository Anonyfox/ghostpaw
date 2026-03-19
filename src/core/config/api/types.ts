import type { ConfigCategory, ConfigSource, ConfigType, ConfigValue } from "../types.ts";

export interface ConfigInfo {
  key: string;
  value: ConfigValue;
  type: ConfigType;
  category: ConfigCategory;
  source: ConfigSource;
  isDefault: boolean;
  label?: string;
  description?: string;
  updatedAt: number | null;
}

export type {
  ConfigCategory,
  ConfigEntry,
  ConfigSource,
  ConfigType,
  ConfigValue,
  KnownConfigKey,
} from "../types.ts";
export { CONFIG_CATEGORIES, CONFIG_SOURCES, CONFIG_TYPES } from "../types.ts";

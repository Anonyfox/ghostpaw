import type { ConfigCategory, ConfigSource, ConfigType } from "../../../core/config/index.ts";

export interface ConfigInfo {
  key: string;
  value: string;
  type: ConfigType;
  category: ConfigCategory;
  source: ConfigSource;
  isDefault: boolean;
  label?: string;
  description?: string;
}

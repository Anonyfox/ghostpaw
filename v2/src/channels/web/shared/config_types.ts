import type { ConfigCategory, ConfigSource, ConfigType } from "../../../core/config/api/types.ts";

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

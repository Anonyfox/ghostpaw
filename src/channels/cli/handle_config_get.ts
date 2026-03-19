import { getConfigInfo } from "../../core/config/api/read/index.ts";
import type {
  ConfigCategory,
  ConfigSource,
  ConfigType,
  ConfigValue,
} from "../../core/config/api/types.ts";
import type { DatabaseHandle } from "../../lib/index.ts";

export interface ConfigGetResult {
  found: boolean;
  key: string;
  value?: ConfigValue;
  type?: ConfigType;
  category?: ConfigCategory;
  source?: ConfigSource;
  isDefault: boolean;
  label?: string;
}

export function handleConfigGet(db: DatabaseHandle, key: string): ConfigGetResult {
  const info = getConfigInfo(db, key);
  if (!info) return { found: false, key, isDefault: false };
  return {
    found: true,
    key,
    value: info.value,
    type: info.type,
    category: info.category,
    source: info.isDefault ? undefined : info.source,
    isDefault: info.isDefault,
    label: info.label,
  };
}

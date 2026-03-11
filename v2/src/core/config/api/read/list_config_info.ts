import type { DatabaseHandle } from "../../../../lib/index.ts";
import { KNOWN_CONFIG_KEYS } from "../../known_keys.ts";
import { listConfig } from "../../list_config.ts";
import { parseConfigValue } from "../../parse_value.ts";
import type { ConfigInfo } from "../types.ts";

export function listConfigInfo(db: DatabaseHandle): ConfigInfo[] {
  return listConfig(db).map((entry) => {
    const known = KNOWN_CONFIG_KEYS.find((candidate) => candidate.key === entry.key);
    return {
      key: entry.key,
      value: safeParseConfigValue(entry.value, entry.type),
      type: entry.type,
      category: entry.category,
      source: entry.source,
      isDefault: entry.id === 0,
      label: known?.label,
      description: known?.description,
      updatedAt: entry.id === 0 ? null : entry.updatedAt,
    };
  });
}

function safeParseConfigValue(rawValue: string, type: ConfigInfo["type"]): ConfigInfo["value"] {
  try {
    return parseConfigValue(rawValue, type);
  } catch {
    return rawValue;
  }
}

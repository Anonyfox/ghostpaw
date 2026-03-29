import type { DatabaseHandle } from "../../lib/database_handle.ts";
import { KNOWN_SETTINGS } from "./known.ts";
import type { SettingCategory } from "./types.ts";

export interface SettingEntry {
  key: string;
  value: string;
  masked: boolean;
  secret: boolean;
  type: string;
  source: string;
  category: SettingCategory;
  description?: string;
  isDefault: boolean;
}

export function listSettings(db: DatabaseHandle): SettingEntry[] {
  const rows = db
    .prepare("SELECT key, value, type, secret, source FROM settings WHERE next_id IS NULL")
    .all() as { key: string; value: string; type: string; secret: number; source: string }[];

  const dbKeys = new Set(rows.map((r) => r.key));
  const entries: SettingEntry[] = [];

  for (const row of rows) {
    const known = KNOWN_SETTINGS[row.key];
    const isSecret = row.secret === 1;
    entries.push({
      key: row.key,
      value: isSecret ? "***" : row.value,
      masked: isSecret,
      secret: isSecret,
      type: row.type,
      source: row.source,
      category: known?.category ?? "custom",
      description: known?.description,
      isDefault: false,
    });
  }

  for (const [key, setting] of Object.entries(KNOWN_SETTINGS)) {
    if (dbKeys.has(key)) continue;
    if (setting.defaultValue === undefined) continue;
    entries.push({
      key,
      value: setting.defaultValue,
      masked: false,
      secret: setting.secret,
      type: setting.type,
      source: "default",
      category: setting.category,
      description: setting.description,
      isDefault: true,
    });
  }

  entries.sort((a, b) => {
    if (a.category !== b.category) return a.category.localeCompare(b.category);
    return a.key.localeCompare(b.key);
  });

  return entries;
}

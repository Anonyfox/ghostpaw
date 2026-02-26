import type { DatabaseHandle } from "../../lib/database.ts";
import { KNOWN_CONFIG_KEYS } from "./known_keys.ts";
import { serializeConfigValue } from "./serialize_value.ts";
import type { ConfigEntry } from "./types.ts";

export function listConfig(db: DatabaseHandle): ConfigEntry[] {
  const rows = db.prepare("SELECT * FROM config WHERE next_id IS NULL").all();

  const dbEntries = new Map<string, ConfigEntry>();
  for (const row of rows) {
    dbEntries.set(row.key as string, {
      id: row.id as number,
      key: row.key as string,
      value: row.value as string,
      type: row.type as ConfigEntry["type"],
      category: row.category as ConfigEntry["category"],
      source: row.source as ConfigEntry["source"],
      nextId: null,
      updatedAt: row.updated_at as number,
    });
  }

  const result: ConfigEntry[] = [];

  for (const known of KNOWN_CONFIG_KEYS) {
    const override = dbEntries.get(known.key);
    if (override) {
      result.push(override);
      dbEntries.delete(known.key);
    } else {
      result.push({
        id: 0,
        key: known.key,
        value: serializeConfigValue(known.defaultValue, known.type),
        type: known.type,
        category: known.category,
        source: "default",
        nextId: null,
        updatedAt: 0,
      });
    }
  }

  const customEntries = [...dbEntries.values()];
  result.push(...customEntries);

  result.sort((a, b) => {
    const catCmp = a.category.localeCompare(b.category);
    if (catCmp !== 0) return catCmp;
    return a.key.localeCompare(b.key);
  });

  return result;
}

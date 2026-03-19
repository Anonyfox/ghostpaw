import type { DatabaseHandle } from "../../lib/index.ts";
import { getCurrentEntry } from "./get_current_entry.ts";
import { KNOWN_CONFIG_KEYS } from "./known_keys.ts";
import { serializeConfigValue } from "./serialize_value.ts";
import type { ConfigCategory, ConfigSource, ConfigType, ConfigValue } from "./types.ts";
import { validateKnownValue } from "./validate_known_value.ts";

export function setConfig(
  db: DatabaseHandle,
  key: string,
  value: ConfigValue,
  source: ConfigSource,
  explicitType?: ConfigType,
): void {
  const known = KNOWN_CONFIG_KEYS.find((k) => k.key === key);
  const type = known ? known.type : (explicitType ?? inferType(value));
  const category: ConfigCategory = known ? known.category : "custom";

  const serialized = serializeConfigValue(value, type);
  validateKnownValue(key, value);

  const current = getCurrentEntry(db, key);

  db.exec("BEGIN");
  try {
    const result = db
      .prepare(
        "INSERT INTO config (key, value, type, category, source, updated_at) VALUES (?, ?, ?, ?, ?, ?)",
      )
      .run(key, serialized, type, category, source, Date.now());

    if (current) {
      db.prepare("UPDATE config SET next_id = ? WHERE id = ?").run(
        result.lastInsertRowid,
        current.id,
      );
    }

    db.exec("COMMIT");
  } catch (err) {
    db.exec("ROLLBACK");
    throw err;
  }
}

function inferType(value: ConfigValue): ConfigType {
  if (typeof value === "boolean") return "boolean";
  if (typeof value === "number") return Number.isInteger(value) ? "integer" : "number";
  return "string";
}

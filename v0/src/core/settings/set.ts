import type { DatabaseHandle } from "../../lib/database_handle.ts";
import { canonicalizeKey } from "./canonicalize.ts";
import { cleanValue } from "./clean.ts";
import { KNOWN_SETTINGS } from "./known.ts";
import { registerSecretKey } from "./scrub.ts";
import type { SettingSource, SettingType } from "./types.ts";

function inferType(value: string): SettingType {
  if (value === "true" || value === "false") return "boolean";
  if (/^-?\d+$/.test(value)) return "integer";
  if (/^-?\d+\.\d+$/.test(value)) return "number";
  return "string";
}

export interface SetSettingOpts {
  source?: SettingSource;
  secret?: boolean;
}

export function setSetting(
  db: DatabaseHandle,
  rawKey: string,
  rawValue: string,
  opts: SetSettingOpts = {},
): { key: string; warning?: string } {
  const key = canonicalizeKey(rawKey);
  if (!key) throw new Error("Setting key must not be empty");
  const value = cleanValue(rawValue);
  const known = KNOWN_SETTINGS[key];
  const source = opts.source ?? "user";
  const secret = known ? known.secret : (opts.secret ?? false);
  const type = known?.type ?? inferType(value);

  let warning: string | undefined;
  if (known?.validate) {
    const msg = known.validate(value);
    if (msg) warning = msg;
  }

  db.exec("BEGIN");
  try {
    const current = db
      .prepare("SELECT id, value FROM settings WHERE key = ? AND next_id IS NULL")
      .get(key) as { id: number; value: string } | undefined;

    if (current) {
      db.prepare("UPDATE settings SET next_id = -1 WHERE id = ?").run(current.id);
    }

    const result = db
      .prepare("INSERT INTO settings (key, value, type, secret, source) VALUES (?, ?, ?, ?, ?)")
      .run(key, value, type, secret ? 1 : 0, source);
    const newId = Number(result.lastInsertRowid);

    if (current) {
      db.prepare("UPDATE settings SET next_id = ? WHERE id = ?").run(newId, current.id);
    }

    db.exec("COMMIT");
  } catch (err) {
    db.exec("ROLLBACK");
    throw err;
  }

  process.env[key] = value;
  if (secret) registerSecretKey(key);

  return { key, warning };
}

import type { DatabaseHandle } from "../../lib/index.ts";
import { rowToSoul } from "./row_to_soul.ts";
import type { CreateSoulInput, Soul } from "./types.ts";

export function createSoul(db: DatabaseHandle, input: CreateSoulInput): Soul {
  if (typeof input.name !== "string") {
    throw new Error("Soul name must be a string.");
  }
  const name = input.name.trim();
  if (name.length === 0) {
    throw new Error("Soul name must not be empty.");
  }
  if (typeof input.essence !== "string") {
    throw new Error("Soul essence must be a string.");
  }
  const description = typeof input.description === "string" ? input.description : "";
  const now = Date.now();
  const { lastInsertRowid } = db
    .prepare(
      `INSERT INTO souls (name, essence, description, level, created_at, updated_at)
       VALUES (?, ?, ?, 0, ?, ?)`,
    )
    .run(name, input.essence, description, now, now);

  const row = db.prepare("SELECT * FROM souls WHERE id = ?").get(lastInsertRowid);
  return rowToSoul(row as Record<string, unknown>);
}

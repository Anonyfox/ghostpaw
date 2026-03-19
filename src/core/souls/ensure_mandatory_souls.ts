import type { DatabaseHandle } from "../../lib/index.ts";
import { BUILTIN_CUSTOM_SOULS, DEFAULT_SOULS } from "./defaults.ts";
import { MANDATORY_SOUL_IDS, MANDATORY_SOUL_NAMES } from "./mandatory_souls.ts";

export function ensureMandatorySouls(db: DatabaseHandle): void {
  const now = Date.now();

  for (const key of MANDATORY_SOUL_NAMES) {
    const id = MANDATORY_SOUL_IDS[key];
    const defaults = DEFAULT_SOULS[key];

    db.prepare(
      `INSERT OR IGNORE INTO souls (id, slug, name, essence, description, level, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, 0, ?, ?)`,
    ).run(id, defaults.slug, defaults.name, defaults.essence, defaults.description, now, now);

    seedTraitsAndBackfill(db, id, defaults, now, true);
  }

  for (const [slug, defaults] of Object.entries(BUILTIN_CUSTOM_SOULS)) {
    const existing = db.prepare("SELECT id FROM souls WHERE slug = ?").get(slug) as
      | { id: number }
      | undefined;
    if (existing) {
      seedTraitsAndBackfill(db, existing.id, defaults, now);
      continue;
    }
    const { lastInsertRowid } = db
      .prepare(
        `INSERT INTO souls (slug, name, essence, description, level, created_at, updated_at)
         VALUES (?, ?, ?, ?, 0, ?, ?)`,
      )
      .run(slug, defaults.name, defaults.essence, defaults.description, now, now);
    seedTraits(db, Number(lastInsertRowid), defaults, now);
  }
}

function seedTraitsAndBackfill(
  db: DatabaseHandle,
  id: number,
  defaults: {
    essence: string;
    description: string;
    traits: { principle: string; provenance: string }[];
  },
  now: number,
  restoreIfDeleted = false,
): void {
  const row = db.prepare("SELECT * FROM souls WHERE id = ?").get(id) as
    | Record<string, unknown>
    | undefined;
  if (!row) return;

  const sets: string[] = [];
  const params: unknown[] = [];
  if (row.deleted_at != null && restoreIfDeleted) {
    sets.push("deleted_at = NULL");
  }
  if ((row.essence as string).trim().length === 0) {
    sets.push("essence = ?");
    params.push(defaults.essence);
  }
  if (!row.description || (row.description as string).trim().length === 0) {
    sets.push("description = ?");
    params.push(defaults.description);
  }
  if (sets.length > 0) {
    sets.push("updated_at = ?");
    params.push(now, id);
    db.prepare(`UPDATE souls SET ${sets.join(", ")} WHERE id = ?`).run(...params);
  }

  seedTraits(db, id, defaults, now);
}

function seedTraits(
  db: DatabaseHandle,
  id: number,
  defaults: { traits: { principle: string; provenance: string }[] },
  now: number,
): void {
  if (defaults.traits.length === 0) return;
  const traitCount = db
    .prepare("SELECT COUNT(*) AS c FROM soul_traits WHERE soul_id = ?")
    .get(id) as { c: number };
  if (traitCount.c > 0) return;
  for (const trait of defaults.traits) {
    db.prepare(
      `INSERT INTO soul_traits (soul_id, principle, provenance, generation, status, created_at, updated_at)
       VALUES (?, ?, ?, 0, 'active', ?, ?)`,
    ).run(id, trait.principle, trait.provenance, now, now);
  }
}

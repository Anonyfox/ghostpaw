import { read, type SoulsDb, write } from "@ghostpaw/souls";
import type { DatabaseHandle } from "../../lib/database_handle.ts";
import type { SoulIds } from "../../runtime.ts";
import { BUILTIN_CUSTOM_BLUEPRINTS, INTERNAL_SOUL_BLUEPRINTS } from "./default_souls.ts";

function db(h: DatabaseHandle): SoulsDb {
  return h as unknown as SoulsDb;
}

/**
 * Ensures the 4 internal souls exist in soulsDb and returns their numeric IDs.
 *
 * Algorithm:
 * 1. Load all souls once.
 * 2. For each internal blueprint, find the soul with a matching slug.
 *    If found, trust its ID (slug is immutable proof of identity even if name changed).
 *    If missing, create it with slug + baseline traits.
 * 3. Return the resolved numeric SoulIds.
 *
 * Custom souls (slug = null) are ignored entirely and never enter the returned map.
 */
export function bootstrapSouls(soulsDb: DatabaseHandle): SoulIds {
  const existing = read.listSouls(db(soulsDb));
  const bySlug = new Map(existing.filter((s) => s.slug !== null).map((s) => [s.slug!, s]));

  const ids: Partial<SoulIds> = {};

  for (const blueprint of INTERNAL_SOUL_BLUEPRINTS) {
    const found = bySlug.get(blueprint.slug);
    if (found) {
      ids[blueprint.slug as keyof SoulIds] = found.id;
    } else {
      const created = write.createSoul(db(soulsDb), {
        name: blueprint.name,
        description: blueprint.description,
        essence: blueprint.essence,
        slug: blueprint.slug,
      });
      for (const trait of blueprint.traits) {
        write.addTrait(db(soulsDb), created.id, {
          principle: trait.principle,
          provenance: trait.provenance,
        });
      }
      ids[blueprint.slug as keyof SoulIds] = created.id;
    }
  }

  return ids as SoulIds;
}

export function bootstrapBuiltinCustomSouls(soulsDb: DatabaseHandle): void {
  const existing = read.listSouls(db(soulsDb));
  const bySlug = new Map(existing.filter((s) => s.slug !== null).map((s) => [s.slug!, s]));

  for (const blueprint of BUILTIN_CUSTOM_BLUEPRINTS) {
    if (bySlug.has(blueprint.slug)) continue;
    const created = write.createSoul(db(soulsDb), {
      name: blueprint.name,
      description: blueprint.description,
      essence: blueprint.essence,
      slug: blueprint.slug,
    });
    for (const trait of blueprint.traits) {
      write.addTrait(db(soulsDb), created.id, {
        principle: trait.principle,
        provenance: trait.provenance,
      });
    }
  }
}

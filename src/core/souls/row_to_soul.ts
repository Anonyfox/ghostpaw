import type { Soul } from "./types.ts";

export function rowToSoul(row: Record<string, unknown>): Soul {
  return {
    id: row.id as number,
    slug: (row.slug as string | null) ?? null,
    name: row.name as string,
    essence: row.essence as string,
    description: (row.description as string) ?? "",
    level: row.level as number,
    createdAt: row.created_at as number,
    updatedAt: row.updated_at as number,
    deletedAt: (row.deleted_at as number | null) ?? null,
    lastAttunedAt: (row.last_attuned_at as number | null) ?? null,
  };
}

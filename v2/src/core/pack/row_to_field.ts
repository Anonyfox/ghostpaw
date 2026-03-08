import type { PackField } from "./types.ts";

export function rowToField(row: Record<string, unknown>): PackField {
  return {
    key: row.key as string,
    value: (row.value as string | null) ?? null,
    updatedAt: row.updated_at as number,
  };
}

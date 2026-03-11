import type { ContactType, PackContact } from "../../types.ts";

export function rowToContact(row: Record<string, unknown>): PackContact {
  return {
    id: row.id as number,
    memberId: row.member_id as number,
    type: row.type as ContactType,
    value: row.value as string,
    label: (row.label as string | null) ?? null,
    createdAt: row.created_at as number,
  };
}

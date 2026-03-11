import type { PackLink } from "../../types.ts";

export function rowToLink(row: Record<string, unknown>): PackLink {
  return {
    id: row.id as number,
    memberId: row.member_id as number,
    targetId: row.target_id as number,
    label: row.label as string,
    role: (row.role as string | null) ?? null,
    active: (row.active as number) === 1,
    createdAt: row.created_at as number,
    updatedAt: row.updated_at as number,
  };
}

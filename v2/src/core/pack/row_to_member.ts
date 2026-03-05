import type { MemberKind, MemberStatus, PackMember } from "./types.ts";

export function rowToMember(row: Record<string, unknown>): PackMember {
  return {
    id: row.id as number,
    name: row.name as string,
    kind: row.kind as MemberKind,
    bond: row.bond as string,
    trust: row.trust as number,
    status: row.status as MemberStatus,
    firstContact: row.first_contact as number,
    lastContact: row.last_contact as number,
    metadata: row.metadata as string,
    createdAt: row.created_at as number,
    updatedAt: row.updated_at as number,
  };
}

import type { MemberKind, MemberStatus, PackMember } from "./types.ts";

export function rowToMember(row: Record<string, unknown>): PackMember {
  return {
    id: row.id as number,
    name: row.name as string,
    nickname: (row.nickname as string | null) ?? null,
    kind: row.kind as MemberKind,
    bond: row.bond as string,
    trust: row.trust as number,
    status: row.status as MemberStatus,
    isUser: (row.is_user as number) === 1,
    parentId: (row.parent_id as number | null) ?? null,
    timezone: (row.timezone as string | null) ?? null,
    locale: (row.locale as string | null) ?? null,
    location: (row.location as string | null) ?? null,
    address: (row.address as string | null) ?? null,
    pronouns: (row.pronouns as string | null) ?? null,
    birthday: (row.birthday as string | null) ?? null,
    firstContact: row.first_contact as number,
    lastContact: row.last_contact as number,
    createdAt: row.created_at as number,
    updatedAt: row.updated_at as number,
  };
}

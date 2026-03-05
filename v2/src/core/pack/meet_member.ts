import type { DatabaseHandle } from "../../lib/index.ts";
import { rowToMember } from "./row_to_member.ts";
import type { MeetInput, PackMember } from "./types.ts";
import { MEMBER_KINDS } from "./types.ts";
import { validateMemberName } from "./validate_member_name.ts";

export function meetMember(db: DatabaseHandle, input: MeetInput): PackMember {
  const name = validateMemberName(input.name);

  if (!MEMBER_KINDS.includes(input.kind)) {
    throw new Error(
      `Invalid member kind "${input.kind}". Must be one of: ${MEMBER_KINDS.join(", ")}.`,
    );
  }

  if (input.metadata !== undefined) {
    try {
      JSON.parse(input.metadata);
    } catch {
      throw new Error("Metadata must be a valid JSON string.");
    }
  }

  const now = Date.now();
  const bond = input.bond?.trim() ?? "";
  const metadata = input.metadata ?? "{}";

  const { lastInsertRowid } = db
    .prepare(
      `INSERT INTO pack_members (name, kind, bond, trust, status, first_contact, last_contact, metadata, created_at, updated_at)
       VALUES (?, ?, ?, 0.5, 'active', ?, ?, ?, ?, ?)`,
    )
    .run(name, input.kind, bond, now, now, metadata, now, now);

  const row = db.prepare("SELECT * FROM pack_members WHERE id = ?").get(lastInsertRowid);
  return rowToMember(row as Record<string, unknown>);
}

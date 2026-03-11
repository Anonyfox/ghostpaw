import type { DatabaseHandle } from "../../lib/index.ts";
import { rowToContact } from "./internal/rows/row_to_contact.ts";
import type { ListContactsOptions, PackContact } from "./types.ts";

export function listContacts(
  db: DatabaseHandle,
  memberId: number,
  options?: ListContactsOptions,
): PackContact[] {
  let sql = "SELECT * FROM pack_contacts WHERE member_id = ?";
  const params: unknown[] = [memberId];

  if (options?.type) {
    sql += " AND type = ?";
    params.push(options.type);
  }

  sql += " ORDER BY type, value";

  const rows = db.prepare(sql).all(...params) as Record<string, unknown>[];
  return rows.map(rowToContact);
}

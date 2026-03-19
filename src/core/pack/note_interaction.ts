import type { DatabaseHandle } from "../../lib/index.ts";
import { rowToInteraction } from "./internal/rows/row_to_interaction.ts";
import type { NoteInput, PackInteraction } from "./types.ts";
import { INTERACTION_KINDS } from "./types.ts";

export function noteInteraction(db: DatabaseHandle, input: NoteInput): PackInteraction {
  if (!Number.isInteger(input.memberId) || input.memberId <= 0) {
    throw new Error("memberId must be a positive integer.");
  }

  const member = db
    .prepare("SELECT id, last_contact FROM pack_members WHERE id = ?")
    .get(input.memberId) as { id: number; last_contact: number } | undefined;
  if (!member) {
    throw new Error(`Pack member with id ${input.memberId} not found.`);
  }

  if (!INTERACTION_KINDS.includes(input.kind)) {
    throw new Error(
      `Invalid interaction kind "${input.kind}". Must be one of: ${INTERACTION_KINDS.join(", ")}.`,
    );
  }

  const summary = typeof input.summary === "string" ? input.summary.trim() : "";
  if (summary.length === 0) {
    throw new Error("Interaction summary must be a non-empty string.");
  }

  const significance = Math.max(0, Math.min(1, input.significance ?? 0.5));
  const now = Date.now();
  const occurredAt = input.occurredAt ?? null;

  const contactTime =
    occurredAt !== null && occurredAt < now ? Math.max(occurredAt, member.last_contact) : now;

  db.exec("BEGIN");
  try {
    db.prepare(
      `INSERT INTO pack_interactions (member_id, kind, summary, significance, session_id, occurred_at, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
    ).run(
      input.memberId,
      input.kind,
      summary,
      significance,
      input.sessionId ?? null,
      occurredAt,
      now,
    );

    db.prepare("UPDATE pack_members SET last_contact = ?, updated_at = ? WHERE id = ?").run(
      contactTime,
      now,
      input.memberId,
    );
    db.exec("COMMIT");
  } catch (err) {
    db.exec("ROLLBACK");
    throw err;
  }

  const lastId = (db.prepare("SELECT last_insert_rowid() AS id").get() as { id: number }).id;
  const row = db.prepare("SELECT * FROM pack_interactions WHERE id = ?").get(lastId);
  return rowToInteraction(row as Record<string, unknown>);
}

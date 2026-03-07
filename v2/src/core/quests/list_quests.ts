import type { DatabaseHandle } from "../../lib/index.ts";
import { rowToQuest } from "./row_to_quest.ts";
import type { ListQuestsOptions, Quest } from "./types.ts";

export function listQuests(db: DatabaseHandle, options: ListQuestsOptions = {}): Quest[] {
  const clauses: string[] = [];
  const values: unknown[] = [];

  if (options.query) {
    const ids = db
      .prepare("SELECT rowid FROM quests_fts WHERE quests_fts MATCH ?")
      .all(options.query) as { rowid: number }[];
    if (ids.length === 0) return [];
    clauses.push(`id IN (${ids.map((r) => r.rowid).join(",")})`);
  }

  if (options.status) {
    clauses.push("status = ?");
    values.push(options.status);
  }

  if (options.excludeStatuses?.length) {
    const placeholders = options.excludeStatuses.map(() => "?").join(",");
    clauses.push(`status NOT IN (${placeholders})`);
    values.push(...options.excludeStatuses);
  }

  if (options.questLogId !== undefined) {
    clauses.push("quest_log_id = ?");
    values.push(options.questLogId);
  }

  if (options.priority) {
    clauses.push("priority = ?");
    values.push(options.priority);
  }

  if (options.dueBefore !== undefined) {
    clauses.push("due_at IS NOT NULL AND due_at <= ?");
    values.push(options.dueBefore);
  }

  if (options.dueAfter !== undefined) {
    clauses.push("due_at IS NOT NULL AND due_at >= ?");
    values.push(options.dueAfter);
  }

  const where = clauses.length > 0 ? `WHERE ${clauses.join(" AND ")}` : "";
  const limit = options.limit ?? 100;
  const offset = options.offset ?? 0;

  const rows = db
    .prepare(`SELECT * FROM quests ${where} ORDER BY updated_at DESC, id DESC LIMIT ? OFFSET ?`)
    .all(...values, limit, offset) as Record<string, unknown>[];

  return rows.map(rowToQuest);
}

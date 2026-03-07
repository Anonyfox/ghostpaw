import type { DatabaseHandle } from "../../lib/index.ts";
import { rowToQuestLog } from "./row_to_quest_log.ts";
import type { ListQuestLogsOptions, QuestLog } from "./types.ts";

export function listQuestLogs(db: DatabaseHandle, options: ListQuestLogsOptions = {}): QuestLog[] {
  const clauses: string[] = [];
  const values: unknown[] = [];

  if (options.status) {
    clauses.push("status = ?");
    values.push(options.status);
  }

  const where = clauses.length > 0 ? `WHERE ${clauses.join(" AND ")}` : "";
  const limit = options.limit ?? 100;
  const offset = options.offset ?? 0;

  const rows = db
    .prepare(`SELECT * FROM quest_logs ${where} ORDER BY updated_at DESC, id DESC LIMIT ? OFFSET ?`)
    .all(...values, limit, offset) as Record<string, unknown>[];

  return rows.map(rowToQuestLog);
}

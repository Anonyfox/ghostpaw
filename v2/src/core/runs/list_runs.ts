import type { DatabaseHandle } from "../../lib/index.ts";
import type { DelegationRun, RunStatus } from "./types.ts";

export function listRuns(
  db: DatabaseHandle,
  parentSessionId: number,
  statusFilter?: RunStatus,
): DelegationRun[] {
  let sql = "SELECT * FROM delegation_runs WHERE parent_session_id = ?";
  const params: unknown[] = [parentSessionId];

  if (statusFilter) {
    sql += " AND status = ?";
    params.push(statusFilter);
  }

  sql += " ORDER BY created_at DESC";

  const rows = db.prepare(sql).all(...params);
  return rows.map(rowToRun);
}

function rowToRun(row: Record<string, unknown>): DelegationRun {
  return {
    id: row.id as number,
    parentSessionId: row.parent_session_id as number,
    childSessionId: (row.child_session_id as number) ?? null,
    specialist: row.specialist as string,
    model: row.model as string,
    task: row.task as string,
    status: row.status as DelegationRun["status"],
    result: (row.result as string) ?? null,
    error: (row.error as string) ?? null,
    tokensIn: row.tokens_in as number,
    tokensOut: row.tokens_out as number,
    reasoningTokens: (row.reasoning_tokens as number) ?? 0,
    cachedTokens: (row.cached_tokens as number) ?? 0,
    costUsd: row.cost_usd as number,
    createdAt: row.created_at as number,
    completedAt: (row.completed_at as number) ?? null,
  };
}

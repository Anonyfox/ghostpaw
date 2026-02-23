import { generateId } from "../lib/ids.js";
import { type GhostpawDatabase, isNullRow } from "./database.js";

export type RunStatus = "running" | "completed" | "failed";

export interface Run {
  id: string;
  sessionId: string;
  parentSessionId: string | null;
  agentProfile: string;
  status: RunStatus;
  prompt: string | null;
  result: string | null;
  error: string | null;
  createdAt: number;
  startedAt: number;
  completedAt: number | null;
  announced: boolean;
}

export interface CreateRunOptions {
  sessionId: string;
  prompt: string;
  agentProfile?: string;
  parentSessionId?: string;
}

export interface RunStore {
  create(options: CreateRunOptions): Run;
  complete(runId: string, result: string): void;
  fail(runId: string, error: string): void;
  get(runId: string): Run | null;
  getActive(sessionId: string): Run | null;
  getCompletedDelegations(parentSessionId: string): Run[];
  markAnnounced(runId: string): void;
}

function rowToRun(row: Record<string, unknown>): Run {
  return {
    id: row.id as string,
    sessionId: row.session_id as string,
    parentSessionId: (row.parent_session_id as string) ?? null,
    agentProfile: (row.agent_profile as string) ?? "default",
    status: row.status as RunStatus,
    prompt: (row.prompt as string) ?? null,
    result: (row.result as string) ?? null,
    error: (row.error as string) ?? null,
    createdAt: row.created_at as number,
    startedAt: (row.started_at as number) ?? 0,
    completedAt: (row.completed_at as number) ?? null,
    announced: row.announced === 1,
  };
}

export function createRunStore(db: GhostpawDatabase): RunStore {
  const { sqlite } = db;

  return {
    create(options) {
      const id = generateId();
      const now = Date.now();

      sqlite
        .prepare(
          `INSERT INTO runs (id, session_id, parent_session_id, agent_profile, status, prompt, created_at, started_at)
           VALUES (?, ?, ?, ?, 'running', ?, ?, ?)`,
        )
        .run(
          id,
          options.sessionId,
          options.parentSessionId ?? null,
          options.agentProfile ?? "default",
          options.prompt,
          now,
          now,
        );

      return {
        id,
        sessionId: options.sessionId,
        parentSessionId: options.parentSessionId ?? null,
        agentProfile: options.agentProfile ?? "default",
        status: "running",
        prompt: options.prompt,
        result: null,
        error: null,
        createdAt: now,
        startedAt: now,
        completedAt: null,
        announced: false,
      };
    },

    complete(runId, result) {
      sqlite
        .prepare(
          "UPDATE runs SET status = 'completed', result = ?, completed_at = ? WHERE id = ?",
        )
        .run(result, Date.now(), runId);
    },

    fail(runId, error) {
      sqlite
        .prepare("UPDATE runs SET status = 'failed', error = ?, completed_at = ? WHERE id = ?")
        .run(error, Date.now(), runId);
    },

    get(runId) {
      const row = sqlite.prepare("SELECT * FROM runs WHERE id = ?").get(runId) as
        | Record<string, unknown>
        | undefined;
      return isNullRow(row) ? null : rowToRun(row);
    },

    getActive(sessionId) {
      const row = sqlite
        .prepare(
          "SELECT * FROM runs WHERE session_id = ? AND parent_session_id IS NULL AND status = 'running' LIMIT 1",
        )
        .get(sessionId) as Record<string, unknown> | undefined;
      return isNullRow(row) ? null : rowToRun(row);
    },

    getCompletedDelegations(parentSessionId) {
      const rows = sqlite
        .prepare(
          `SELECT * FROM runs
           WHERE parent_session_id = ? AND status = 'completed' AND announced = 0
           ORDER BY completed_at ASC`,
        )
        .all(parentSessionId) as Record<string, unknown>[];
      return rows.map(rowToRun);
    },

    markAnnounced(runId) {
      sqlite.prepare("UPDATE runs SET announced = 1 WHERE id = ?").run(runId);
    },
  };
}

import type { RuntimeContext } from "../../runtime.ts";

export type PulseType = "builtin" | "agent" | "shell";

export interface Pulse {
  id: number;
  name: string;
  type: PulseType;
  command: string;
  interval_ms: number | null;
  cron_expr: string | null;
  timeout_ms: number;
  enabled: number;
  next_run_at: string;
  running: number;
  running_pid: number | null;
  started_at: string | null;
  last_run_at: string | null;
  last_exit_code: number | null;
  run_count: number;
  created_at: string;
  updated_at: string;
}

export interface PulseRun {
  id: number;
  pulse_id: number;
  pulse_name: string;
  session_id: number | null;
  started_at: string;
  finished_at: string | null;
  duration_ms: number | null;
  exit_code: number | null;
  error: string | null;
  output: string | null;
  created_at: string;
}

export type BuiltinHandler = (ctx: RuntimeContext, signal: AbortSignal) => Promise<JobResult>;

export interface JobResult {
  exitCode: number;
  sessionId?: number | null;
  output?: string;
  error?: string;
}

export type RunAgentTask = (
  name: string,
  prompt: string,
  signal: AbortSignal,
) => Promise<JobResult>;

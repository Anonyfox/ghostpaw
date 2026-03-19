export const SCHEDULE_TYPES = ["builtin", "custom"] as const;
export type ScheduleType = (typeof SCHEDULE_TYPES)[number];

export interface Schedule {
  id: number;
  name: string;
  type: ScheduleType;
  command: string;
  intervalMs: number;
  timeoutMs: number | null;
  enabled: boolean;
  nextRunAt: number;
  runningPid: number | null;
  startedAt: number | null;
  lastRunAt: number | null;
  lastExitCode: number | null;
  lastError: string | null;
  runCount: number;
  failCount: number;
  createdAt: number;
  updatedAt: number;
}

export interface CreateScheduleInput {
  name: string;
  type: ScheduleType;
  command: string;
  intervalMs: number;
  timeoutMs?: number;
  enabled?: boolean;
}

export interface UpdateScheduleInput {
  intervalMs?: number;
  timeoutMs?: number | null;
  enabled?: boolean;
  command?: string;
}

export const SCHEDULE_TYPES = ["builtin", "custom"] as const;
export type ScheduleType = (typeof SCHEDULE_TYPES)[number];

export interface Schedule {
  id: number;
  name: string;
  type: ScheduleType;
  command: string;
  intervalMs: number;
  enabled: boolean;
  nextRunAt: number;
  runningPid: number | null;
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
  enabled?: boolean;
}

export interface UpdateScheduleInput {
  intervalMs?: number;
  enabled?: boolean;
  command?: string;
}

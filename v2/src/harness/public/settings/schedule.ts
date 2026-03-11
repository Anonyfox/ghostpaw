import type {
  CreateScheduleInput,
  Schedule,
  UpdateScheduleInput,
} from "../../../core/schedule/api/types.ts";
import {
  createSchedule,
  deleteSchedule,
  updateSchedule,
} from "../../../core/schedule/api/write/index.ts";
import type { DatabaseHandle } from "../../../lib/index.ts";

export function createManagedSchedule(db: DatabaseHandle, input: CreateScheduleInput): Schedule {
  return createSchedule(db, input);
}

export function updateManagedSchedule(
  db: DatabaseHandle,
  id: number,
  input: UpdateScheduleInput,
): Schedule {
  return updateSchedule(db, id, input);
}

export function deleteManagedSchedule(db: DatabaseHandle, id: number): void {
  deleteSchedule(db, id);
}

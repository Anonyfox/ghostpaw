import type { CreateScheduleInput } from "./types.ts";

export const DEFAULT_SCHEDULES: CreateScheduleInput[] = [
  {
    name: "haunt",
    type: "builtin",
    command: "haunt",
    intervalMs: 1_800_000,
    enabled: false,
  },
  {
    name: "distill",
    type: "builtin",
    command: "distill",
    intervalMs: 7_200_000,
    enabled: true,
  },
];

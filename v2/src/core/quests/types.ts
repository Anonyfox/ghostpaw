export const QUEST_STATUSES = [
  "offered",
  "pending",
  "active",
  "blocked",
  "done",
  "failed",
  "cancelled",
] as const;
export type QuestStatus = (typeof QUEST_STATUSES)[number];

export const TERMINAL_STATUSES: readonly QuestStatus[] = ["done", "failed", "cancelled"];
export const BOARD_STATUSES: readonly QuestStatus[] = ["offered"];
export const ACTIVE_VIEW_STATUSES: readonly QuestStatus[] = ["pending", "active", "blocked"];
export const DEFAULT_EXCLUDE_STATUSES: readonly QuestStatus[] = [
  "offered",
  "done",
  "failed",
  "cancelled",
];

export const QUEST_PRIORITIES = ["low", "normal", "high", "urgent"] as const;
export type QuestPriority = (typeof QUEST_PRIORITIES)[number];

export const QUEST_LOG_STATUSES = ["active", "completed", "archived"] as const;
export type QuestLogStatus = (typeof QUEST_LOG_STATUSES)[number];

export const QUEST_CREATORS = ["human", "ghostpaw"] as const;
export type QuestCreator = (typeof QUEST_CREATORS)[number];

export interface Quest {
  id: number;
  title: string;
  description: string | null;
  status: QuestStatus;
  priority: QuestPriority;
  questLogId: number | null;
  tags: string | null;
  createdAt: number;
  createdBy: QuestCreator;
  updatedAt: number;
  startsAt: number | null;
  endsAt: number | null;
  dueAt: number | null;
  remindAt: number | null;
  remindedAt: number | null;
  completedAt: number | null;
  rrule: string | null;
}

export interface QuestLog {
  id: number;
  title: string;
  description: string | null;
  status: QuestLogStatus;
  createdAt: number;
  createdBy: QuestCreator;
  updatedAt: number;
  completedAt: number | null;
  dueAt: number | null;
}

export interface QuestOccurrence {
  id: number;
  questId: number;
  occurrenceAt: number;
  status: "done" | "skipped";
  completedAt: number;
}

export interface CreateQuestInput {
  title: string;
  description?: string;
  status?: QuestStatus;
  questLogId?: number;
  priority?: QuestPriority;
  tags?: string;
  createdBy?: QuestCreator;
  startsAt?: number;
  endsAt?: number;
  dueAt?: number;
  remindAt?: number;
  rrule?: string;
}

export interface UpdateQuestInput {
  title?: string;
  description?: string | null;
  status?: QuestStatus;
  priority?: QuestPriority;
  questLogId?: number | null;
  tags?: string | null;
  startsAt?: number | null;
  endsAt?: number | null;
  dueAt?: number | null;
  remindAt?: number | null;
  remindedAt?: number | null;
  rrule?: string | null;
}

export interface CreateQuestLogInput {
  title: string;
  description?: string;
  dueAt?: number;
  createdBy?: QuestCreator;
}

export interface UpdateQuestLogInput {
  title?: string;
  description?: string | null;
  status?: QuestLogStatus;
  dueAt?: number | null;
}

export interface ListQuestsOptions {
  status?: QuestStatus;
  excludeStatuses?: QuestStatus[];
  questLogId?: number;
  priority?: QuestPriority;
  dueBefore?: number;
  dueAfter?: number;
  query?: string;
  limit?: number;
  offset?: number;
}

export interface ListQuestLogsOptions {
  status?: QuestLogStatus;
  limit?: number;
  offset?: number;
}

export interface QuestLogProgress {
  total: number;
  done: number;
  active: number;
  pending: number;
  blocked: number;
  offered: number;
}

export interface TemporalContext {
  overdue: Quest[];
  dueSoon: Quest[];
  todayEvents: Quest[];
  activeQuests: Quest[];
  pendingReminders: Quest[];
}

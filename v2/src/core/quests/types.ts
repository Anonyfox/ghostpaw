export const QUEST_STATUSES = [
  "offered",
  "accepted",
  "active",
  "blocked",
  "done",
  "turned_in",
  "failed",
  "abandoned",
] as const;
export type QuestStatus = (typeof QUEST_STATUSES)[number];

export const TERMINAL_STATUSES: readonly QuestStatus[] = [
  "done",
  "turned_in",
  "failed",
  "abandoned",
];
export const BOARD_STATUSES: readonly QuestStatus[] = ["offered"];
export const ACTIVE_VIEW_STATUSES: readonly QuestStatus[] = ["accepted", "active", "blocked"];
export const DEFAULT_EXCLUDE_STATUSES: readonly QuestStatus[] = [
  "offered",
  "done",
  "turned_in",
  "failed",
  "abandoned",
];

export const QUEST_PRIORITIES = ["low", "normal", "high", "urgent"] as const;
export type QuestPriority = (typeof QUEST_PRIORITIES)[number];

export const STORYLINE_STATUSES = ["active", "completed", "archived"] as const;
export type StorylineStatus = (typeof STORYLINE_STATUSES)[number];

export const QUEST_CREATORS = ["human", "ghostpaw"] as const;
export type QuestCreator = (typeof QUEST_CREATORS)[number];

export interface Quest {
  id: number;
  title: string;
  description: string | null;
  status: QuestStatus;
  priority: QuestPriority;
  storylineId: number | null;
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
  position: number | null;
  turnInNarrative: string | null;
}

export interface Storyline {
  id: number;
  title: string;
  description: string | null;
  status: StorylineStatus;
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
  storylineId?: number;
  priority?: QuestPriority;
  tags?: string;
  createdBy?: QuestCreator;
  startsAt?: number;
  endsAt?: number;
  dueAt?: number;
  remindAt?: number;
  rrule?: string;
  position?: number;
}

export interface UpdateQuestInput {
  title?: string;
  description?: string | null;
  status?: QuestStatus;
  priority?: QuestPriority;
  storylineId?: number | null;
  tags?: string | null;
  startsAt?: number | null;
  endsAt?: number | null;
  dueAt?: number | null;
  remindAt?: number | null;
  remindedAt?: number | null;
  rrule?: string | null;
  position?: number | null;
  turnInNarrative?: string | null;
}

export interface CreateStorylineInput {
  title: string;
  description?: string;
  dueAt?: number;
  createdBy?: QuestCreator;
}

export interface UpdateStorylineInput {
  title?: string;
  description?: string | null;
  status?: StorylineStatus;
  dueAt?: number | null;
}

export interface ListQuestsOptions {
  status?: QuestStatus;
  excludeStatuses?: QuestStatus[];
  storylineId?: number;
  priority?: QuestPriority;
  dueBefore?: number;
  dueAfter?: number;
  query?: string;
  limit?: number;
  offset?: number;
}

export interface ListStorylinesOptions {
  status?: StorylineStatus;
  limit?: number;
  offset?: number;
}

export interface StorylineProgress {
  total: number;
  done: number;
  active: number;
  accepted: number;
  blocked: number;
  offered: number;
}

export interface StreakInfo {
  currentStreak: number;
  longestStreak: number;
  totalDone: number;
  totalSkipped: number;
  lastCompletedAt: number | null;
  atRisk: boolean;
}

export interface Subgoal {
  id: number;
  questId: number;
  text: string;
  done: boolean;
  position: number;
  createdAt: number;
  doneAt: number | null;
}

export interface TemporalContext {
  overdue: Quest[];
  dueSoon: Quest[];
  todayEvents: Quest[];
  activeQuests: Quest[];
  pendingReminders: Quest[];
}

export type QuestStatus =
  | "offered"
  | "accepted"
  | "active"
  | "blocked"
  | "done"
  | "turned_in"
  | "failed"
  | "abandoned";
export type QuestPriority = "low" | "normal" | "high" | "urgent";
export type StorylineStatus = "active" | "completed" | "archived";

export interface QuestInfo {
  id: number;
  title: string;
  description: string | null;
  status: QuestStatus;
  priority: QuestPriority;
  storylineId: number | null;
  tags: string | null;
  createdBy: string;
  createdAt: number;
  updatedAt: number;
  startsAt: number | null;
  endsAt: number | null;
  dueAt: number | null;
  remindAt: number | null;
  remindedAt: number | null;
  completedAt: number | null;
  rrule: string | null;
}

export interface QuestOccurrenceInfo {
  id: number;
  occurrenceAt: number;
  status: "done" | "skipped";
  completedAt: number;
}

export interface StreakInfo {
  currentStreak: number;
  longestStreak: number;
  totalDone: number;
  totalSkipped: number;
  lastCompletedAt: number | null;
  atRisk: boolean;
}

export interface SubgoalInfo {
  id: number;
  text: string;
  done: boolean;
  position: number;
}

export interface CostEstimateInfo {
  low: number;
  high: number;
  confidence: string;
  sampleSize: number;
}

export interface QuestDetailResponse extends QuestInfo {
  occurrences: QuestOccurrenceInfo[];
  streak: StreakInfo | null;
  subgoals: SubgoalInfo[];
  xpEarned: number;
  costEstimate: CostEstimateInfo | null;
}

export interface QuestTrailHint {
  chapter: { id: number; label: string; momentum: string } | null;
  linkedLoops: { id: number; description: string; significance: number; status: string }[];
}

export interface QuestListResponse {
  quests: QuestInfo[];
  total: number;
}

export interface StorylineInfo {
  id: number;
  title: string;
  description: string | null;
  status: StorylineStatus;
  createdBy: string;
  createdAt: number;
  updatedAt: number;
  completedAt: number | null;
  dueAt: number | null;
  xpEarned: number;
  progress: {
    total: number;
    done: number;
    active: number;
    accepted: number;
    blocked: number;
    offered: number;
  };
}

export interface TurnInResponse {
  quest: QuestInfo;
  revealedShards: number;
  fragmentDropped: boolean;
  xpEarned: number;
}

export interface StorylineDetailResponse extends StorylineInfo {
  quests: QuestInfo[];
}

export interface StorylineListResponse {
  storylines: StorylineInfo[];
}

export interface TemporalContextResponse {
  overdue: QuestInfo[];
  dueSoon: QuestInfo[];
  todayEvents: QuestInfo[];
  activeQuests: QuestInfo[];
  pendingReminders: QuestInfo[];
}

export interface CreateQuestBody {
  title: string;
  description?: string;
  status?: QuestStatus;
  priority?: QuestPriority;
  storylineId?: number;
  tags?: string;
  createdBy?: "human" | "ghostpaw";
  startsAt?: number;
  endsAt?: number;
  dueAt?: number;
  remindAt?: number;
  rrule?: string;
}

export interface UpdateQuestBody {
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
  rrule?: string | null;
}

export interface CreateStorylineBody {
  title: string;
  description?: string;
  dueAt?: number;
  createdBy?: "human" | "ghostpaw";
}

export interface UpdateStorylineBody {
  title?: string;
  description?: string | null;
  status?: StorylineStatus;
  dueAt?: number | null;
}

export function rruleLabel(rrule: string | null): string | null {
  if (!rrule) return null;
  if (rrule === "FREQ=DAILY") return "Daily";
  if (rrule.startsWith("FREQ=WEEKLY")) return "Weekly";
  if (rrule.startsWith("FREQ=MONTHLY")) return "Monthly";
  if (rrule.startsWith("FREQ=YEARLY")) return "Yearly";
  return "Recurring";
}

export function relativeDue(ts: number, now = Date.now()): string {
  const diff = ts - now;
  if (diff < 0) {
    const ago = Math.abs(diff);
    const mins = Math.floor(ago / 60000);
    if (mins < 60) return `${mins}m overdue`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h overdue`;
    return `${Math.floor(hrs / 24)}d overdue`;
  }
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins}m left`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h left`;
  return `${Math.floor(hrs / 24)}d left`;
}

export function relativeAge(ts: number, now = Date.now()): string {
  const diff = now - ts;
  const mins = Math.floor(Math.abs(diff) / 60000);
  if (mins < 60) return `${mins}m`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h`;
  return `${Math.floor(hrs / 24)}d`;
}

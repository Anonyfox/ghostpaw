export type QuestStatus =
  | "offered"
  | "pending"
  | "active"
  | "blocked"
  | "done"
  | "failed"
  | "cancelled";
export type QuestPriority = "low" | "normal" | "high" | "urgent";
export type QuestLogStatus = "active" | "completed" | "archived";

export interface QuestInfo {
  id: number;
  title: string;
  description: string | null;
  status: QuestStatus;
  priority: QuestPriority;
  questLogId: number | null;
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

export interface QuestDetailResponse extends QuestInfo {
  occurrences: QuestOccurrenceInfo[];
}

export interface QuestListResponse {
  quests: QuestInfo[];
  total: number;
}

export interface QuestLogInfo {
  id: number;
  title: string;
  description: string | null;
  status: QuestLogStatus;
  createdBy: string;
  createdAt: number;
  updatedAt: number;
  completedAt: number | null;
  dueAt: number | null;
  progress: {
    total: number;
    done: number;
    active: number;
    pending: number;
    blocked: number;
    offered: number;
  };
}

export interface QuestLogDetailResponse extends QuestLogInfo {
  quests: QuestInfo[];
}

export interface QuestLogListResponse {
  logs: QuestLogInfo[];
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
  questLogId?: number;
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
  questLogId?: number | null;
  tags?: string | null;
  startsAt?: number | null;
  endsAt?: number | null;
  dueAt?: number | null;
  remindAt?: number | null;
  rrule?: string | null;
}

export interface CreateQuestLogBody {
  title: string;
  description?: string;
  dueAt?: number;
  createdBy?: "human" | "ghostpaw";
}

export interface UpdateQuestLogBody {
  title?: string;
  description?: string | null;
  status?: QuestLogStatus;
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

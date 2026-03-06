import type { Quest, QuestLog, QuestLogProgress } from "../../core/quests/index.ts";

export function formatQuest(q: Quest) {
  const out: Record<string, unknown> = {
    id: q.id,
    title: q.title,
    status: q.status,
    priority: q.priority,
    createdBy: q.createdBy,
  };
  if (q.description) out.description = q.description;
  if (q.questLogId) out.questLogId = q.questLogId;
  if (q.tags) out.tags = q.tags;
  if (q.dueAt) out.dueAt = q.dueAt;
  if (q.startsAt) out.startsAt = q.startsAt;
  if (q.endsAt) out.endsAt = q.endsAt;
  if (q.remindAt) out.remindAt = q.remindAt;
  if (q.rrule) out.rrule = q.rrule;
  if (q.completedAt) out.completedAt = q.completedAt;
  out.createdAt = q.createdAt;
  out.updatedAt = q.updatedAt;
  return out;
}

export function formatQuestBrief(q: Quest) {
  const out: Record<string, unknown> = {
    id: q.id,
    title: q.title,
    status: q.status,
    priority: q.priority,
  };
  if (q.dueAt) out.dueAt = q.dueAt;
  if (q.questLogId) out.questLogId = q.questLogId;
  if (q.rrule) out.rrule = q.rrule;
  return out;
}

export function formatQuestLog(log: QuestLog, progress?: QuestLogProgress) {
  const out: Record<string, unknown> = {
    id: log.id,
    title: log.title,
    status: log.status,
  };
  if (log.description) out.description = log.description;
  if (log.dueAt) out.dueAt = log.dueAt;
  if (progress) out.progress = progress;
  out.createdAt = log.createdAt;
  return out;
}

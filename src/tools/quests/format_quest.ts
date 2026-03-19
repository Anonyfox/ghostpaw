import type {
  Quest,
  Storyline,
  StorylineProgress,
  StreakInfo,
} from "../../core/quests/api/types.ts";

interface FormatQuestOptions {
  streak?: StreakInfo | null;
  xp?: number;
}

export function formatQuest(q: Quest, opts?: FormatQuestOptions) {
  const out: Record<string, unknown> = {
    id: q.id,
    title: q.title,
    status: q.status,
    priority: q.priority,
    createdBy: q.createdBy,
  };
  if (q.description) out.description = q.description;
  if (q.storylineId) out.storylineId = q.storylineId;
  if (q.tags) out.tags = q.tags;
  if (q.dueAt) out.dueAt = q.dueAt;
  if (q.startsAt) out.startsAt = q.startsAt;
  if (q.endsAt) out.endsAt = q.endsAt;
  if (q.remindAt) out.remindAt = q.remindAt;
  if (q.rrule) out.rrule = q.rrule;
  if (q.completedAt) out.completedAt = q.completedAt;
  if (opts?.streak && q.rrule) {
    out.streak = {
      current: opts.streak.currentStreak,
      longest: opts.streak.longestStreak,
      totalDone: opts.streak.totalDone,
      totalSkipped: opts.streak.totalSkipped,
    };
  }
  if (opts?.xp !== undefined && opts.xp > 0) out.xpEarned = opts.xp;
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
  if (q.storylineId) out.storylineId = q.storylineId;
  if (q.rrule) out.rrule = q.rrule;
  return out;
}

export function formatStoryline(log: Storyline, progress?: StorylineProgress) {
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

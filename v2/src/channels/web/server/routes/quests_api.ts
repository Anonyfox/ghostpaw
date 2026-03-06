import type { IncomingMessage } from "node:http";
import {
  acceptQuest,
  completeQuest,
  createQuest,
  createQuestLog,
  dismissQuest,
  getQuest,
  getQuestLog,
  getQuestLogProgress,
  getTemporalContext,
  listOccurrences,
  listQuestLogs,
  listQuests,
  skipOccurrence,
  updateQuest,
  updateQuestLog,
} from "../../../../core/quests/index.ts";
import type { Quest, QuestLog, QuestOccurrence, QuestStatus } from "../../../../core/quests/index.ts";
import type { DatabaseHandle } from "../../../../lib/index.ts";
import type {
  CreateQuestBody,
  CreateQuestLogBody,
  QuestInfo,
  QuestLogInfo,
  UpdateQuestBody,
  UpdateQuestLogBody,
} from "../../shared/quest_types.ts";
import { readJsonBody } from "../body_parser.ts";
import type { RouteContext } from "../types.ts";

function json(ctx: RouteContext, status: number, data: unknown): void {
  ctx.res.writeHead(status, { "Content-Type": "application/json" });
  ctx.res.end(JSON.stringify(data));
}

function parseQuery(url: string | undefined): URLSearchParams {
  if (!url) return new URLSearchParams();
  const idx = url.indexOf("?");
  if (idx < 0) return new URLSearchParams();
  return new URLSearchParams(url.slice(idx + 1));
}

async function parseBody(req: IncomingMessage): Promise<Record<string, unknown> | null> {
  try {
    const body = await readJsonBody(req);
    if (typeof body === "object" && body !== null) return body as Record<string, unknown>;
  } catch { /* invalid body */ }
  return null;
}

function toQuestInfo(q: Quest): QuestInfo {
  return {
    id: q.id,
    title: q.title,
    description: q.description,
    status: q.status,
    priority: q.priority,
    questLogId: q.questLogId,
    tags: q.tags,
    createdBy: q.createdBy,
    createdAt: q.createdAt,
    updatedAt: q.updatedAt,
    startsAt: q.startsAt,
    endsAt: q.endsAt,
    dueAt: q.dueAt,
    remindAt: q.remindAt,
    remindedAt: q.remindedAt,
    completedAt: q.completedAt,
    rrule: q.rrule,
  };
}

function toQuestLogInfo(log: QuestLog, db: DatabaseHandle): QuestLogInfo {
  const progress = getQuestLogProgress(db, log.id);
  return {
    id: log.id,
    title: log.title,
    description: log.description,
    status: log.status,
    createdBy: log.createdBy,
    createdAt: log.createdAt,
    updatedAt: log.updatedAt,
    completedAt: log.completedAt,
    dueAt: log.dueAt,
    progress,
  };
}

export function createQuestsApiHandlers(db: DatabaseHandle) {
  return {
    list(ctx: RouteContext) {
      const qs = parseQuery(ctx.req.url);
      const excludeRaw = qs.get("exclude");
      const excludeStatuses = excludeRaw
        ? (excludeRaw.split(",").filter(Boolean) as QuestStatus[])
        : undefined;
      const quests = listQuests(db, {
        status: qs.get("status") as Quest["status"] | undefined ?? undefined,
        priority: qs.get("priority") as Quest["priority"] | undefined ?? undefined,
        questLogId: qs.get("log") ? Number(qs.get("log")) : undefined,
        query: qs.get("query") ?? undefined,
        excludeStatuses,
        limit: qs.get("limit") ? Number(qs.get("limit")) : 100,
        offset: qs.get("offset") ? Number(qs.get("offset")) : 0,
      });
      json(ctx, 200, { quests: quests.map(toQuestInfo), total: quests.length });
    },

    context(ctx: RouteContext) {
      const tc = getTemporalContext(db);
      json(ctx, 200, {
        overdue: tc.overdue.map(toQuestInfo),
        dueSoon: tc.dueSoon.map(toQuestInfo),
        todayEvents: tc.todayEvents.map(toQuestInfo),
        activeQuests: tc.activeQuests.map(toQuestInfo),
        pendingReminders: tc.pendingReminders.map(toQuestInfo),
      });
    },

    async create(ctx: RouteContext) {
      const body = await parseBody(ctx.req);
      if (!body) return json(ctx, 400, { error: "Invalid request body." });
      const { title, description, status, priority, questLogId, tags, createdBy, startsAt, endsAt, dueAt, remindAt, rrule } = body as unknown as CreateQuestBody;
      if (!title?.trim()) return json(ctx, 400, { error: "Title is required." });
      try {
        const q = createQuest(db, { title, description, status, priority, questLogId, tags, createdBy, startsAt, endsAt, dueAt, remindAt, rrule });
        json(ctx, 201, toQuestInfo(q));
      } catch (err) {
        json(ctx, 400, { error: (err as Error).message });
      }
    },

    detail(ctx: RouteContext) {
      const id = Number(ctx.params.id);
      if (!Number.isInteger(id)) return json(ctx, 400, { error: "Invalid quest ID." });
      const q = getQuest(db, id);
      if (!q) return json(ctx, 404, { error: `Quest #${id} not found.` });
      const occurrences = q.rrule
        ? listOccurrences(db, id, { limit: 50 }).map((o) => ({
            id: o.id, occurrenceAt: o.occurrenceAt, status: o.status, completedAt: o.completedAt,
          }))
        : [];
      json(ctx, 200, { ...toQuestInfo(q), occurrences });
    },

    async update(ctx: RouteContext) {
      const id = Number(ctx.params.id);
      if (!Number.isInteger(id)) return json(ctx, 400, { error: "Invalid quest ID." });
      const body = await parseBody(ctx.req);
      if (!body) return json(ctx, 400, { error: "Invalid request body." });
      const { title, description, status, priority, questLogId, tags, startsAt, endsAt, dueAt, remindAt, rrule } = body as unknown as UpdateQuestBody;
      try {
        const q = updateQuest(db, id, { title, description, status, priority, questLogId, tags, startsAt, endsAt, dueAt, remindAt, rrule });
        json(ctx, 200, toQuestInfo(q));
      } catch (err) {
        json(ctx, 400, { error: (err as Error).message });
      }
    },

    async done(ctx: RouteContext) {
      const id = Number(ctx.params.id);
      if (!Number.isInteger(id)) return json(ctx, 400, { error: "Invalid quest ID." });
      try {
        const result = completeQuest(db, id);
        if ("questId" in result) {
          json(ctx, 200, { type: "occurrence", ...(result as QuestOccurrence) });
        } else {
          json(ctx, 200, { type: "quest", ...toQuestInfo(result as Quest) });
        }
      } catch (err) {
        json(ctx, 400, { error: (err as Error).message });
      }
    },

    async occurrence(ctx: RouteContext) {
      const id = Number(ctx.params.id);
      if (!Number.isInteger(id)) return json(ctx, 400, { error: "Invalid quest ID." });
      const body = await parseBody(ctx.req);
      if (!body) return json(ctx, 400, { error: "Invalid request body." });
      const occurrenceAt = body.occurrenceAt as number | undefined;
      const status = (body.status as string) ?? "done";
      if (!occurrenceAt) return json(ctx, 400, { error: "occurrenceAt is required." });
      try {
        if (status === "skipped") {
          const occ = skipOccurrence(db, id, occurrenceAt);
          json(ctx, 201, occ);
        } else {
          const occ = completeQuest(db, id, occurrenceAt);
          json(ctx, 201, occ);
        }
      } catch (err) {
        json(ctx, 400, { error: (err as Error).message });
      }
    },

    logList(ctx: RouteContext) {
      const qs = parseQuery(ctx.req.url);
      const logs = listQuestLogs(db, {
        status: qs.get("status") as QuestLog["status"] | undefined ?? undefined,
        limit: qs.get("limit") ? Number(qs.get("limit")) : 50,
      });
      json(ctx, 200, { logs: logs.map((l) => toQuestLogInfo(l, db)) });
    },

    async logCreate(ctx: RouteContext) {
      const body = await parseBody(ctx.req);
      if (!body) return json(ctx, 400, { error: "Invalid request body." });
      const { title, description, dueAt, createdBy } = body as unknown as CreateQuestLogBody;
      if (!title?.trim()) return json(ctx, 400, { error: "Title is required." });
      try {
        const log = createQuestLog(db, { title, description, dueAt, createdBy });
        json(ctx, 201, toQuestLogInfo(log, db));
      } catch (err) {
        json(ctx, 400, { error: (err as Error).message });
      }
    },

    logDetail(ctx: RouteContext) {
      const id = Number(ctx.params.id);
      if (!Number.isInteger(id)) return json(ctx, 400, { error: "Invalid quest log ID." });
      const log = getQuestLog(db, id);
      if (!log) return json(ctx, 404, { error: `Quest log #${id} not found.` });
      const quests = listQuests(db, { questLogId: id, limit: 200 });
      json(ctx, 200, { ...toQuestLogInfo(log, db), quests: quests.map(toQuestInfo) });
    },

    async logUpdate(ctx: RouteContext) {
      const id = Number(ctx.params.id);
      if (!Number.isInteger(id)) return json(ctx, 400, { error: "Invalid quest log ID." });
      const body = await parseBody(ctx.req);
      if (!body) return json(ctx, 400, { error: "Invalid request body." });
      const { title, description, status, dueAt } = body as unknown as UpdateQuestLogBody;
      try {
        const log = updateQuestLog(db, id, { title, description, status, dueAt });
        json(ctx, 200, toQuestLogInfo(log, db));
      } catch (err) {
        json(ctx, 400, { error: (err as Error).message });
      }
    },

    async logDone(ctx: RouteContext) {
      const id = Number(ctx.params.id);
      if (!Number.isInteger(id)) return json(ctx, 400, { error: "Invalid quest log ID." });
      try {
        const log = updateQuestLog(db, id, { status: "completed" });
        json(ctx, 200, toQuestLogInfo(log, db));
      } catch (err) {
        json(ctx, 400, { error: (err as Error).message });
      }
    },

    async accept(ctx: RouteContext) {
      const id = Number(ctx.params.id);
      if (!Number.isInteger(id)) return json(ctx, 400, { error: "Invalid quest ID." });
      const body = await parseBody(ctx.req);
      const questLogId = body?.questLogId as number | undefined;
      try {
        const q = acceptQuest(db, id, { questLogId });
        json(ctx, 200, toQuestInfo(q));
      } catch (err) {
        json(ctx, 400, { error: (err as Error).message });
      }
    },

    async dismiss(ctx: RouteContext) {
      const id = Number(ctx.params.id);
      if (!Number.isInteger(id)) return json(ctx, 400, { error: "Invalid quest ID." });
      try {
        const q = dismissQuest(db, id);
        json(ctx, 200, toQuestInfo(q));
      } catch (err) {
        json(ctx, 400, { error: (err as Error).message });
      }
    },
  };
}

import type { IncomingMessage } from "node:http";
import {
  getQuest,
  getStoryline,
  getStorylineProgress,
  getStreakInfo,
  getTemporalContext,
  listOccurrences,
  listQuests,
  listStorylines,
  listSubgoals,
} from "../../../../core/quests/api/read/index.ts";
import type {
  Quest,
  QuestOccurrence,
  QuestStatus,
  Storyline,
} from "../../../../core/quests/api/types.ts";
import {
  acceptQuest,
  completeQuest,
  createQuest,
  createStoryline,
  dismissQuest,
  skipOccurrence,
  updateQuest,
  updateStoryline,
} from "../../../../core/quests/api/write/index.ts";
import type { DatabaseHandle } from "../../../../lib/index.ts";
import type {
  CreateQuestBody,
  CreateStorylineBody,
  QuestInfo,
  StorylineInfo,
  UpdateQuestBody,
  UpdateStorylineBody,
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
  } catch {
    /* invalid body */
  }
  return null;
}

function toQuestInfo(q: Quest): QuestInfo {
  return {
    id: q.id,
    title: q.title,
    description: q.description,
    status: q.status,
    priority: q.priority,
    storylineId: q.storylineId,
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

function toStorylineInfo(storyline: Storyline, db: DatabaseHandle): StorylineInfo {
  const progress = getStorylineProgress(db, storyline.id);
  return {
    id: storyline.id,
    title: storyline.title,
    description: storyline.description,
    status: storyline.status,
    createdBy: storyline.createdBy,
    createdAt: storyline.createdAt,
    updatedAt: storyline.updatedAt,
    completedAt: storyline.completedAt,
    dueAt: storyline.dueAt,
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
        status: (qs.get("status") as Quest["status"] | undefined) ?? undefined,
        priority: (qs.get("priority") as Quest["priority"] | undefined) ?? undefined,
        storylineId: qs.get("storyline") ? Number(qs.get("storyline")) : undefined,
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
      const {
        title,
        description,
        status,
        priority,
        storylineId,
        tags,
        createdBy,
        startsAt,
        endsAt,
        dueAt,
        remindAt,
        rrule,
      } = body as unknown as CreateQuestBody;
      if (!title?.trim()) return json(ctx, 400, { error: "Title is required." });
      try {
        const q = createQuest(db, {
          title,
          description,
          status,
          priority,
          storylineId,
          tags,
          createdBy,
          startsAt,
          endsAt,
          dueAt,
          remindAt,
          rrule,
        });
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
            id: o.id,
            occurrenceAt: o.occurrenceAt,
            status: o.status,
            completedAt: o.completedAt,
          }))
        : [];
      const streak = q.rrule ? getStreakInfo(db, id) : null;
      const subgoals = listSubgoals(db, id).map((s) => ({
        id: s.id,
        text: s.text,
        done: s.done,
        position: s.position,
      }));
      json(ctx, 200, { ...toQuestInfo(q), occurrences, streak, subgoals });
    },

    async update(ctx: RouteContext) {
      const id = Number(ctx.params.id);
      if (!Number.isInteger(id)) return json(ctx, 400, { error: "Invalid quest ID." });
      const body = await parseBody(ctx.req);
      if (!body) return json(ctx, 400, { error: "Invalid request body." });
      const {
        title,
        description,
        status,
        priority,
        storylineId,
        tags,
        startsAt,
        endsAt,
        dueAt,
        remindAt,
        rrule,
      } = body as unknown as UpdateQuestBody;
      try {
        const q = updateQuest(db, id, {
          title,
          description,
          status,
          priority,
          storylineId,
          tags,
          startsAt,
          endsAt,
          dueAt,
          remindAt,
          rrule,
        });
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

    storylineList(ctx: RouteContext) {
      const qs = parseQuery(ctx.req.url);
      const storylines = listStorylines(db, {
        status: (qs.get("status") as Storyline["status"] | undefined) ?? undefined,
        limit: qs.get("limit") ? Number(qs.get("limit")) : 50,
      });
      json(ctx, 200, { storylines: storylines.map((s) => toStorylineInfo(s, db)) });
    },

    async storylineCreate(ctx: RouteContext) {
      const body = await parseBody(ctx.req);
      if (!body) return json(ctx, 400, { error: "Invalid request body." });
      const { title, description, dueAt, createdBy } = body as unknown as CreateStorylineBody;
      if (!title?.trim()) return json(ctx, 400, { error: "Title is required." });
      try {
        const storyline = createStoryline(db, { title, description, dueAt, createdBy });
        json(ctx, 201, toStorylineInfo(storyline, db));
      } catch (err) {
        json(ctx, 400, { error: (err as Error).message });
      }
    },

    storylineDetail(ctx: RouteContext) {
      const id = Number(ctx.params.id);
      if (!Number.isInteger(id)) return json(ctx, 400, { error: "Invalid storyline ID." });
      const storyline = getStoryline(db, id);
      if (!storyline) return json(ctx, 404, { error: `Storyline #${id} not found.` });
      const quests = listQuests(db, { storylineId: id, limit: 200 });
      json(ctx, 200, { ...toStorylineInfo(storyline, db), quests: quests.map(toQuestInfo) });
    },

    async storylineUpdate(ctx: RouteContext) {
      const id = Number(ctx.params.id);
      if (!Number.isInteger(id)) return json(ctx, 400, { error: "Invalid storyline ID." });
      const body = await parseBody(ctx.req);
      if (!body) return json(ctx, 400, { error: "Invalid request body." });
      const { title, description, status, dueAt } = body as unknown as UpdateStorylineBody;
      try {
        const storyline = updateStoryline(db, id, { title, description, status, dueAt });
        json(ctx, 200, toStorylineInfo(storyline, db));
      } catch (err) {
        json(ctx, 400, { error: (err as Error).message });
      }
    },

    async storylineDone(ctx: RouteContext) {
      const id = Number(ctx.params.id);
      if (!Number.isInteger(id)) return json(ctx, 400, { error: "Invalid storyline ID." });
      try {
        const storyline = updateStoryline(db, id, { status: "completed" });
        json(ctx, 200, toStorylineInfo(storyline, db));
      } catch (err) {
        json(ctx, 400, { error: (err as Error).message });
      }
    },

    async accept(ctx: RouteContext) {
      const id = Number(ctx.params.id);
      if (!Number.isInteger(id)) return json(ctx, 400, { error: "Invalid quest ID." });
      const body = await parseBody(ctx.req);
      const storylineId = body?.storylineId as number | undefined;
      try {
        const q = acceptQuest(db, id, { storylineId });
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

import { useCallback, useEffect, useState } from "preact/hooks";
import type { TemporalContextResponse } from "../../shared/quest_types.ts";
import { relativeDue } from "../../shared/quest_types.ts";
import { apiGet } from "../api_get.ts";

interface Props {
  onQuestClick?: (id: number) => void;
  boardCount?: number;
}

export function QuestBulletinBoard({ onQuestClick, boardCount }: Props) {
  const [ctx, setCtx] = useState<TemporalContextResponse | null>(null);

  const load = useCallback(() => {
    apiGet<TemporalContextResponse>("/api/quests/context")
      .then(setCtx)
      .catch(() => {});
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  if (!ctx) return null;

  const total =
    ctx.overdue.length +
    ctx.pendingReminders.length +
    ctx.todayEvents.length +
    ctx.activeQuests.length +
    ctx.dueSoon.length;

  if (total === 0 && (!boardCount || boardCount === 0)) {
    return <div class="text-body-tertiary small mb-3">All clear — no urgent quests.</div>;
  }

  if (total === 0 && boardCount && boardCount > 0) {
    return (
      <div class="text-body-tertiary small mb-3">
        All clear — <span class="text-warning fw-semibold">! {boardCount}</span> on the quest board.
      </div>
    );
  }

  const counts: string[] = [];
  if (ctx.overdue.length > 0) counts.push(`${ctx.overdue.length} overdue`);
  if (ctx.pendingReminders.length > 0)
    counts.push(
      `${ctx.pendingReminders.length} reminder${ctx.pendingReminders.length !== 1 ? "s" : ""}`,
    );
  if (ctx.todayEvents.length > 0) counts.push(`${ctx.todayEvents.length} today`);
  if (ctx.activeQuests.length > 0) counts.push(`${ctx.activeQuests.length} active`);
  if (ctx.dueSoon.length > 0) counts.push(`${ctx.dueSoon.length} due soon`);

  const click = (id: number) => (e: Event) => {
    e.preventDefault();
    onQuestClick?.(id);
  };

  return (
    <div class="mb-3">
      <div class="text-body-secondary small mb-2">{counts.join(" / ")}</div>

      {ctx.overdue.length > 0 && (
        <div class="bulletin-section border-start border-3 border-danger ps-3 py-1 mb-2">
          <div class="small fw-semibold text-danger mb-1">Overdue</div>
          {ctx.overdue.map((q) => (
            <div key={q.id} class="small">
              <button
                type="button"
                class="btn btn-link p-0 text-body text-decoration-none border-0"
                onClick={click(q.id)}
              >
                {q.title}
              </button>
              {q.dueAt && <span class="text-danger ms-2">{relativeDue(q.dueAt)}</span>}
            </div>
          ))}
        </div>
      )}

      {ctx.pendingReminders.length > 0 && (
        <div class="bulletin-section border-start border-3 border-warning ps-3 py-1 mb-2">
          <div class="small fw-semibold text-warning mb-1">Reminders</div>
          {ctx.pendingReminders.map((q) => (
            <div key={q.id} class="small">
              <button
                type="button"
                class="btn btn-link p-0 text-body text-decoration-none border-0"
                onClick={click(q.id)}
              >
                {q.title}
              </button>
            </div>
          ))}
        </div>
      )}

      {ctx.todayEvents.length > 0 && (
        <div class="bulletin-section border-start border-3 border-info ps-3 py-1 mb-2">
          <div class="small fw-semibold text-info mb-1">Today</div>
          {ctx.todayEvents.map((q) => {
            const time = q.startsAt ? new Date(q.startsAt).toISOString().slice(11, 16) : "";
            return (
              <div key={q.id} class="small">
                {time && <span class="text-info me-1">{time}</span>}
                <button
                  type="button"
                  class="btn btn-link p-0 text-body text-decoration-none border-0"
                  onClick={click(q.id)}
                >
                  {q.title}
                </button>
              </div>
            );
          })}
        </div>
      )}

      {ctx.dueSoon.length > 0 && (
        <div class="bulletin-section border-start border-3 border-secondary ps-3 py-1 mb-2">
          <div class="small fw-semibold text-body-secondary mb-1">Due Soon</div>
          {ctx.dueSoon.map((q) => (
            <div key={q.id} class="small">
              <button
                type="button"
                class="btn btn-link p-0 text-body text-decoration-none border-0"
                onClick={click(q.id)}
              >
                {q.title}
              </button>
              {q.dueAt && <span class="text-body-tertiary ms-2">{relativeDue(q.dueAt)}</span>}
            </div>
          ))}
        </div>
      )}

      {boardCount != null && boardCount > 0 && (
        <div class="small text-warning mb-2">
          <span class="fw-semibold">!</span> {boardCount} quest{boardCount !== 1 ? "s" : ""} on the
          board
        </div>
      )}
    </div>
  );
}

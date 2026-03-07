import { Link } from "wouter-preact";
import type { QuestLogInfo } from "../../shared/quest_types.ts";
import { relativeDue } from "../../shared/quest_types.ts";
import { QuestStatusPill } from "./quest_status_pill.tsx";

interface Props {
  log: QuestLogInfo;
}

export function QuestLogCard({ log }: Props) {
  const { progress } = log;
  const pct = progress.total > 0 ? Math.round((progress.done / progress.total) * 100) : 0;

  return (
    <Link href={`/quests/logs/${log.id}`} class="text-decoration-none">
      <div class="card border h-100">
        <div class="card-body">
          <div class="d-flex justify-content-between align-items-start mb-2">
            <h6 class="card-title mb-0 text-body">{log.title}</h6>
            <QuestStatusPill status={log.status} />
          </div>
          {log.description && (
            <p
              class="card-text small text-body-secondary mb-2"
              style="overflow: hidden; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical;"
            >
              {log.description}
            </p>
          )}
          <div class="progress quest-progress-bar mb-1" style="height: 8px;">
            <div
              class="progress-bar bg-info"
              role="progressbar"
              style={`width: ${pct}%`}
              aria-valuenow={pct}
              aria-valuemin={0}
              aria-valuemax={100}
            />
          </div>
          <div class="d-flex justify-content-between align-items-center">
            <span class="small text-body-tertiary">
              {progress.done}/{progress.total} done
            </span>
            {log.dueAt && (
              <span
                class={`small ${log.dueAt < Date.now() ? "text-danger" : "text-body-tertiary"}`}
              >
                {relativeDue(log.dueAt)}
              </span>
            )}
          </div>
        </div>
      </div>
    </Link>
  );
}

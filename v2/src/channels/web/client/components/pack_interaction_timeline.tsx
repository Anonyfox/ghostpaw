import type { PackInteractionInfo } from "../../shared/pack_types.ts";
import { relativeTime } from "../relative_time.ts";

interface PackInteractionTimelineProps {
  interactions: PackInteractionInfo[];
}

const KIND_COLORS: Record<string, string> = {
  conversation: "bg-success",
  correction: "bg-warning",
  conflict: "bg-danger",
  gift: "bg-info",
  milestone: "bg-primary",
  observation: "bg-secondary",
  transaction: "bg-info",
  activity: "bg-success",
};

export function PackInteractionTimeline({ interactions }: PackInteractionTimelineProps) {
  if (interactions.length === 0) {
    return <p class="text-muted small">No interactions recorded yet.</p>;
  }

  return (
    <div class="position-relative" style="padding-left: 20px;">
      <div
        class="position-absolute bg-secondary"
        style="left: 5px; top: 0; bottom: 0; width: 2px; opacity: 0.3;"
      />
      {interactions.map((ix) => {
        const dotColor = KIND_COLORS[ix.kind] ?? KIND_COLORS.observation;
        const sigWidth = Math.max(10, Math.round(ix.significance * 100));
        return (
          <div key={ix.id} class="mb-3 position-relative">
            <span
              class={`rounded-circle position-absolute ${dotColor}`}
              style="width: 10px; height: 10px; left: -19px; top: 5px;"
            />
            <div class="d-flex justify-content-between align-items-start">
              <div>
                <span class="badge bg-secondary bg-opacity-50 me-1">{ix.kind}</span>
                <span class="small">{ix.summary}</span>
              </div>
              <small class="text-body-tertiary text-nowrap ms-2">
                {ix.occurredAt != null && ix.occurredAt !== ix.createdAt
                  ? new Date(ix.occurredAt).toLocaleDateString(undefined, {
                      year: "numeric",
                      month: "short",
                      day: "numeric",
                    })
                  : relativeTime(ix.createdAt)}
              </small>
            </div>
            <div
              class={`mt-1 rounded ${dotColor}`}
              style={`height: 3px; width: ${sigWidth}%; opacity: 0.6;`}
            />
          </div>
        );
      })}
    </div>
  );
}

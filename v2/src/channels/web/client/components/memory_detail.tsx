import { useEffect, useState } from "preact/hooks";
import type { MemoryDetailResponse } from "../../shared/memory_types.ts";
import { apiGet } from "../api_get.ts";
import { relativeTime } from "../relative_time.ts";
import { MemoryCommandBox } from "./memory_command_box.tsx";

const SOURCE_EXPLANATIONS: Record<string, string> = {
  explicit: "You told the ghost this directly",
  observed: "The ghost verified this by observation",
  distilled: "Distilled from conversation",
  inferred: "The ghost concluded this on its own",
};

const CATEGORY_EXPLANATIONS: Record<string, string> = {
  preference: "A personal preference or taste",
  fact: "An objective fact or piece of knowledge",
  procedure: "A process, workflow, or how-to",
  capability: "A skill, ability, or tooling detail",
  custom: "Uncategorized belief",
};

function formatDate(ts: number): string {
  return new Date(ts).toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

interface MemoryDetailProps {
  memoryId: number;
  onSuccess: () => void;
}

export function MemoryDetail({ memoryId, onSuccess }: MemoryDetailProps) {
  const [detail, setDetail] = useState<MemoryDetailResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    apiGet<MemoryDetailResponse>(`/api/memories/${memoryId}`)
      .then(setDetail)
      .catch(() => setError("Failed to load memory details."));
  }, [memoryId]);

  if (error && !detail) {
    return <div class="p-3 text-danger small">{error}</div>;
  }

  if (!detail) {
    return <div class="p-3 text-body-tertiary small">Loading...</div>;
  }

  return (
    // biome-ignore lint/a11y/noStaticElementInteractions: click/key handlers prevent event bubbling to parent row
    <section
      class="bg-body-tertiary border-top p-3"
      onClick={(e) => e.stopPropagation()}
      onKeyDown={(e) => e.stopPropagation()}
    >
      <p class="mb-3 text-body">{detail.claim}</p>

      <div class="row g-3 small">
        <div class="col-sm-6 col-md-4">
          <div class="text-body-tertiary">Confidence</div>
          <div>
            {detail.confidence.toFixed(2)}{" "}
            <span
              class={
                detail.strength === "strong"
                  ? "text-success"
                  : detail.strength === "fading"
                    ? "text-warning"
                    : "text-body-tertiary"
              }
            >
              ({detail.strength})
            </span>
          </div>
          <div class="text-body-tertiary" style="font-size: 0.75rem;">
            How strongly the ghost believes this
          </div>
        </div>

        <div class="col-sm-6 col-md-4">
          <div class="text-body-tertiary">Evidence</div>
          <div>
            {detail.evidenceCount} confirmation{detail.evidenceCount !== 1 ? "s" : ""}
          </div>
          <div class="text-body-tertiary" style="font-size: 0.75rem;">
            Each confirmation makes this memory resist fading
          </div>
        </div>

        <div class="col-sm-6 col-md-4">
          <div class="text-body-tertiary">Source</div>
          <div>{detail.source}</div>
          <div class="text-body-tertiary" style="font-size: 0.75rem;">
            {SOURCE_EXPLANATIONS[detail.source]}
          </div>
        </div>

        <div class="col-sm-6 col-md-4">
          <div class="text-body-tertiary">Category</div>
          <div>{detail.category}</div>
          <div class="text-body-tertiary" style="font-size: 0.75rem;">
            {CATEGORY_EXPLANATIONS[detail.category]}
          </div>
        </div>

        <div class="col-sm-6 col-md-4">
          <div class="text-body-tertiary">Created</div>
          <div>
            {formatDate(detail.createdAt)}{" "}
            <span class="text-body-tertiary">({relativeTime(detail.createdAt)})</span>
          </div>
        </div>

        <div class="col-sm-6 col-md-4">
          <div class="text-body-tertiary">Last verified</div>
          <div>
            {formatDate(detail.verifiedAt)}{" "}
            <span class="text-body-tertiary">({relativeTime(detail.verifiedAt)})</span>
          </div>
          <div class="text-body-tertiary" style="font-size: 0.75rem;">
            When this was last confirmed or refreshed
          </div>
        </div>

        <div class="col-sm-6 col-md-4">
          <div class="text-body-tertiary">Freshness</div>
          <div>{(detail.freshness * 100).toFixed(1)}%</div>
          <div class="text-body-tertiary" style="font-size: 0.75rem;">
            Current recall weight accounting for age and evidence
          </div>
        </div>
      </div>

      {(detail.supersedes || detail.supersededBy) && (
        <div class="mt-3 small">
          {detail.supersedes && (
            <div class="text-body-tertiary">
              Replaced memory <span class="text-info">#{detail.supersedes}</span>
            </div>
          )}
          {detail.supersededBy && (
            <div class="text-body-tertiary">
              Superseded by memory <span class="text-info">#{detail.supersededBy}</span>
            </div>
          )}
        </div>
      )}

      <div class="mt-3">
        <MemoryCommandBox memoryId={detail.id} onSuccess={onSuccess} />
      </div>
    </section>
  );
}

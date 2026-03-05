import { useCallback, useEffect, useState } from "preact/hooks";
import type { MemoryDetailResponse, MemoryInfo } from "../../shared/memory_types.ts";
import { apiGet } from "../api_get.ts";
import { apiPatch } from "../api_patch.ts";

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

function relativeTime(ts: number): string {
  const diff = Date.now() - ts;
  const minutes = Math.floor(diff / 60_000);
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;
  const months = Math.floor(days / 30);
  if (months < 12) return `${months}mo ago`;
  return `${Math.floor(months / 12)}y ago`;
}

interface MemoryDetailProps {
  memoryId: number;
  onConfirm: (id: number) => void;
  onForget: (id: number) => void;
  onUpdated: (updated: MemoryInfo) => void;
}

export function MemoryDetail({ memoryId, onConfirm, onForget, onUpdated }: MemoryDetailProps) {
  const [detail, setDetail] = useState<MemoryDetailResponse | null>(null);
  const [editing, setEditing] = useState(false);
  const [editText, setEditText] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    apiGet<MemoryDetailResponse>(`/api/memories/${memoryId}`)
      .then(setDetail)
      .catch(() => setError("Failed to load memory details."));
  }, [memoryId]);

  const handleEdit = useCallback(() => {
    if (detail) {
      setEditText(detail.claim);
      setEditing(true);
    }
  }, [detail]);

  const handleSave = useCallback(async () => {
    if (!editText.trim()) return;
    setSaving(true);
    setError(null);
    try {
      const updated = await apiPatch<MemoryInfo>(`/api/memories/${memoryId}`, {
        claim: editText.trim(),
      });
      onUpdated(updated);
      setEditing(false);
    } catch {
      setError("Failed to save correction.");
    } finally {
      setSaving(false);
    }
  }, [editText, memoryId, onUpdated]);

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
      {editing ? (
        <div class="mb-3">
          <textarea
            class="form-control form-control-sm mb-2"
            rows={3}
            value={editText}
            onInput={(e) => setEditText((e.target as HTMLTextAreaElement).value)}
          />
          <div class="d-flex gap-2">
            <button
              type="button"
              class="btn btn-sm btn-info"
              disabled={saving || !editText.trim()}
              onClick={handleSave}
            >
              {saving ? "Saving..." : "Save correction"}
            </button>
            <button
              type="button"
              class="btn btn-sm btn-outline-secondary"
              onClick={() => setEditing(false)}
            >
              Cancel
            </button>
          </div>
          {error && <div class="text-danger small mt-1">{error}</div>}
        </div>
      ) : (
        <p class="mb-3 text-body">{detail.claim}</p>
      )}

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

      <div class="d-flex gap-2 mt-3">
        <button
          type="button"
          class="btn btn-sm btn-outline-info"
          onClick={() => onConfirm(detail.id)}
        >
          Confirm
        </button>
        {!editing && (
          <button type="button" class="btn btn-sm btn-outline-secondary" onClick={handleEdit}>
            Edit
          </button>
        )}
        <button
          type="button"
          class="btn btn-sm btn-outline-danger"
          onClick={() => {
            if (
              confirm(
                "Forget this memory? It will be excluded from future recall but preserved in history.",
              )
            ) {
              onForget(detail.id);
            }
          }}
        >
          Forget
        </button>
      </div>
    </section>
  );
}

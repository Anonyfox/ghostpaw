import { useState } from "preact/hooks";
import type { TraitInfo } from "../../shared/soul_types.ts";
import { apiPatch } from "../api_patch.ts";
import { apiPost } from "../api_post.ts";

interface SoulTraitRowProps {
  trait: TraitInfo;
  soulId: number;
  isDormant: boolean;
  onUpdated: () => void;
}

const statusColors: Record<string, string> = {
  active: "bg-success",
  consolidated: "bg-info",
  promoted: "bg-warning text-dark",
  reverted: "bg-secondary",
};

export function SoulTraitRow({ trait, soulId, isDormant, onUpdated }: SoulTraitRowProps) {
  const [editing, setEditing] = useState(false);
  const [principle, setPrinciple] = useState(trait.principle);
  const [provenance, setProvenance] = useState(trait.provenance);
  const [error, setError] = useState<string | null>(null);

  const handleRevise = async () => {
    setError(null);
    try {
      await apiPatch(`/api/souls/${soulId}/traits/${trait.id}`, { principle, provenance });
      setEditing(false);
      onUpdated();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to revise.");
    }
  };

  const handleRevert = async () => {
    try {
      await apiPost(`/api/souls/${soulId}/traits/${trait.id}/revert`);
      onUpdated();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to revert.");
    }
  };

  const handleReactivate = async () => {
    try {
      await apiPost(`/api/souls/${soulId}/traits/${trait.id}/reactivate`);
      onUpdated();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to reactivate.");
    }
  };

  return (
    <li class="list-group-item">
      <div class="d-flex justify-content-between align-items-start">
        <div class="flex-grow-1">
          {editing ? (
            <div>
              <input
                type="text"
                class="form-control form-control-sm mb-1"
                value={principle}
                onInput={(e) => setPrinciple((e.target as HTMLInputElement).value)}
              />
              <input
                type="text"
                class="form-control form-control-sm mb-1"
                value={provenance}
                onInput={(e) => setProvenance((e.target as HTMLInputElement).value)}
              />
              <div class="d-flex gap-1">
                <button type="button" class="btn btn-sm btn-info" onClick={handleRevise}>
                  Save
                </button>
                <button
                  type="button"
                  class="btn btn-sm btn-outline-secondary"
                  onClick={() => setEditing(false)}
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <div>
              <strong>{trait.principle}</strong>
              <div class="text-muted small">{trait.provenance}</div>
            </div>
          )}
        </div>
        <div class="d-flex align-items-center gap-2 ms-2">
          <span class={`badge ${statusColors[trait.status] ?? "bg-secondary"}`}>
            {trait.status}
          </span>
          <span class="text-body-tertiary small">Gen {trait.generation}</span>
        </div>
      </div>
      {!isDormant && !editing && (
        <div class="mt-1 d-flex gap-1">
          {trait.status === "active" && (
            <>
              <button
                type="button"
                class="btn btn-sm btn-outline-info"
                onClick={() => setEditing(true)}
              >
                Revise
              </button>
              <button type="button" class="btn btn-sm btn-outline-warning" onClick={handleRevert}>
                Revert
              </button>
            </>
          )}
          {trait.status !== "active" && (
            <button type="button" class="btn btn-sm btn-outline-success" onClick={handleReactivate}>
              Reactivate
            </button>
          )}
        </div>
      )}
      {error && <div class="alert alert-danger py-1 px-2 small mt-1">{error}</div>}
    </li>
  );
}

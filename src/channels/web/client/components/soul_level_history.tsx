import { useState } from "preact/hooks";
import type { LevelInfo } from "../../shared/soul_types.ts";
import { apiPost } from "../api_post.ts";

interface SoulLevelHistoryProps {
  levels: LevelInfo[];
  soulId: number;
  isDormant: boolean;
  onUpdated: () => void;
}

export function SoulLevelHistory({ levels, soulId, isDormant, onUpdated }: SoulLevelHistoryProps) {
  const [error, setError] = useState<string | null>(null);
  const sorted = [...levels].sort((a, b) => b.level - a.level);
  const latestLevel = sorted[0]?.level;

  const handleRevert = async () => {
    setError(null);
    if (!confirm("Revert the most recent level-up? This cannot be undone.")) return;
    try {
      await apiPost(`/api/souls/${soulId}/revert-level-up`);
      onUpdated();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to revert.");
    }
  };

  return (
    <div>
      <h5 class="mb-3">Level History</h5>
      {error && <div class="alert alert-danger py-1 px-2 small mb-2">{error}</div>}
      {sorted.length === 0 ? (
        <p class="text-muted small">No level-ups yet.</p>
      ) : (
        <div class="accordion" id="level-history">
          {sorted.map((lvl) => {
            const collapseId = `level-${lvl.id}`;
            const isLatest = lvl.level === latestLevel;
            return (
              <div class="accordion-item" key={lvl.id}>
                <h2 class="accordion-header">
                  <button
                    class="accordion-button collapsed"
                    type="button"
                    data-bs-toggle="collapse"
                    data-bs-target={`#${collapseId}`}
                  >
                    Level {lvl.level} — {new Date(lvl.createdAt).toLocaleDateString()}
                  </button>
                </h2>
                <div id={collapseId} class="accordion-collapse collapse">
                  <div class="accordion-body small">
                    <div class="mb-2">
                      <strong>Essence before:</strong>
                      <div class="text-muted">{lvl.essenceBefore.slice(0, 200)}</div>
                    </div>
                    <div class="mb-2">
                      <strong>Essence after:</strong>
                      <div>{lvl.essenceAfter.slice(0, 200)}</div>
                    </div>
                    <div class="d-flex gap-3 mb-2">
                      <span>Consolidated: {lvl.traitsConsolidated.length}</span>
                      <span>Promoted: {lvl.traitsPromoted.length}</span>
                      <span>Carried: {lvl.traitsCarried.length}</span>
                    </div>
                    {isLatest && !isDormant && (
                      <button
                        type="button"
                        class="btn btn-outline-danger btn-sm"
                        onClick={handleRevert}
                      >
                        Revert Level-Up
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
